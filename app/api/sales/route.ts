import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Employee from "@/models/Employee";
import { authOptions } from "@/lib/authOptions";
import { calculateSalePricing } from "@/lib/salePricing";
import { PipelineStage, Types } from "mongoose";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET all sales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const usesDataTable =
      searchParams.has("page") ||
      searchParams.has("limit") ||
      searchParams.has("search") ||
      searchParams.has("paymentMethod") ||
      searchParams.has("sortBy") ||
      searchParams.has("sortOrder");

    // Preserve the existing employee-details API response until that screen is
    // migrated to server pagination separately.
    if (!usesDataTable) {
      const legacyQuery = employeeId ? { employee: employeeId } : {};
      const sales = await Sale.find(legacyQuery)
        .populate("employee", "fullName profilePhoto")
        .populate("items.product", "title photo")
        .sort({ createdAt: -1 });
      return NextResponse.json(sales);
    }

    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10,
    );
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 10;
    const search = searchParams.get("search")?.trim() || "";
    const paymentMethod = searchParams.get("paymentMethod");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const match: Record<string, unknown> = {};
    if (employeeId && Types.ObjectId.isValid(employeeId)) {
      match.employee = new Types.ObjectId(employeeId);
    }
    if (paymentMethod === "Cash" || paymentMethod === "Online") {
      match.paymentMethod = paymentMethod;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      const matchingEmployees = await Employee.find({
        fullName: searchRegex,
      }).select("_id");
      match.$or = [
        { "customer.name": searchRegex },
        { "customer.phone": searchRegex },
        { "customer.email": searchRegex },
        { employee: { $in: matchingEmployees.map((employee) => employee._id) } },
      ];
    }

    const total = await Sale.countDocuments(match);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);

    const pipeline: PipelineStage[] = [{ $match: match }];
    if (sortBy === "employee") {
      pipeline.push(
        {
          $lookup: {
            from: "employees",
            localField: "employee",
            foreignField: "_id",
            as: "sortEmployee",
          },
        },
        {
          $addFields: {
            employeeSortName: {
              $toLower: {
                $ifNull: [{ $arrayElemAt: ["$sortEmployee.fullName", 0] }, ""],
              },
            },
          },
        },
      );
    }
    if (sortBy === "collected") {
      pipeline.push({
        $addFields: {
          collectedSortAmount: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$payments", []] } }, 0] },
              {
                $sum: {
                  $map: {
                    input: { $ifNull: ["$payments", []] },
                    as: "payment",
                    in: "$$payment.amount",
                  },
                },
              },
              {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      { $eq: [{ $type: "$paymentStatus" }, "missing"] },
                    ],
                  },
                  "$totalAmount",
                  { $ifNull: ["$paidAmount", 0] },
                ],
              },
            ],
          },
        },
      });
    }

    const sortFields: Record<string, string> = {
      date: "createdAt",
      employee: "employeeSortName",
      customer: "customer.name",
      total: "totalAmount",
      collected: "collectedSortAmount",
    };
    const sortField = sortFields[sortBy] || "createdAt";
    pipeline.push(
      { $sort: { [sortField]: sortOrder, _id: sortOrder } },
      { $skip: (currentPage - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1 } },
    );

    const pageIds = await Sale.aggregate<{ _id: Types.ObjectId }>(pipeline);
    const pageSales = await Sale.find({
      _id: { $in: pageIds.map((sale) => sale._id) },
    })
      .populate("employee", "fullName profilePhoto")
      .populate("items.product", "title photo");
    const salesById = new Map(
      pageSales.map((sale) => [sale._id.toString(), sale]),
    );
    const sales = pageIds
      .map(({ _id }) => salesById.get(_id.toString()))
      .filter(Boolean);

    const [collectionTotals] = await Sale.aggregate<{
      cash: number;
      online: number;
    }>([
      { $match: match },
      {
        $project: {
          payments: { $ifNull: ["$payments", []] },
          paymentMethod: 1,
          paymentStatus: 1,
          totalAmount: 1,
        },
      },
      {
        $project: {
          cash: {
            $cond: [
              { $gt: [{ $size: "$payments" }, 0] },
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$payments",
                        as: "payment",
                        cond: { $eq: ["$$payment.method", "Cash"] },
                      },
                    },
                    as: "payment",
                    in: "$$payment.amount",
                  },
                },
              },
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentMethod", "Cash"] },
                      {
                        $or: [
                          { $eq: ["$paymentStatus", "Paid"] },
                          { $eq: [{ $type: "$paymentStatus" }, "missing"] },
                        ],
                      },
                    ],
                  },
                  "$totalAmount",
                  0,
                ],
              },
            ],
          },
          online: {
            $cond: [
              { $gt: [{ $size: "$payments" }, 0] },
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$payments",
                        as: "payment",
                        cond: { $eq: ["$$payment.method", "Online"] },
                      },
                    },
                    as: "payment",
                    in: "$$payment.amount",
                  },
                },
              },
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentMethod", "Online"] },
                      {
                        $or: [
                          { $eq: ["$paymentStatus", "Paid"] },
                          { $eq: [{ $type: "$paymentStatus" }, "missing"] },
                        ],
                      },
                    ],
                  },
                  "$totalAmount",
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          cash: { $sum: "$cash" },
          online: { $sum: "$online" },
        },
      },
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
      },
      collectionTotals: {
        cash: collectionTotals?.cash || 0,
        online: collectionTotals?.online || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

// POST create new sale
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { employeeId, items, customer, paymentMethod } = body;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee is required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { error: "Customer name and phone are required" },
        { status: 400 }
      );
    }

    const billingAddress = customer.billingAddress?.trim() || customer.address?.trim();
    if (!billingAddress) {
      return NextResponse.json(
        { error: "Billing address is required" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Validate items and check employee has these products
    const employeeProductIds = employee.products.map((p: { product: { toString: () => string } }) => 
      p.product.toString()
    );

    for (const item of items) {
      if (!employeeProductIds.includes(item.productId)) {
        return NextResponse.json(
          { error: `Employee does not have product: ${item.productTitle}` },
          { status: 400 }
        );
      }

      // Find the employee's product assignment
      const assignment = employee.products.find(
        (p: { product: { toString: () => string } }) => p.product.toString() === item.productId
      );

      if (assignment && assignment.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient quantity for ${item.productTitle}. Available: ${assignment.quantity}` },
          { status: 400 }
        );
      }
    }

    const pricing = await calculateSalePricing(items);
    if (pricing.missingProducts.length > 0) {
      return NextResponse.json(
        { error: `Products not found: ${pricing.missingProducts.join(", ")}` },
        { status: 400 }
      );
    }

    // Create the sale
    const sale = await Sale.create({
      employee: employeeId,
      items: pricing.saleItems,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || undefined,
        billingAddress,
      },
      paymentMethod,
      subtotal: pricing.subtotal,
      totalGst: pricing.totalGst,
      totalAmount: pricing.totalAmount,
      paidAmount: pricing.totalAmount,
      remainingAmount: 0,
      paymentStatus: "Paid",
      payments: [
        {
          amount: pricing.totalAmount,
          method: paymentMethod,
          collectedAt: new Date(),
        },
      ],
    });

    // Deduct quantities from employee's products
    for (const item of items) {
      const assignmentIndex = employee.products.findIndex(
        (p: { product: { toString: () => string } }) => p.product.toString() === item.productId
      );

      if (assignmentIndex !== -1) {
        employee.products[assignmentIndex].quantity -= item.quantity;

        // Remove assignment if quantity becomes 0
        if (employee.products[assignmentIndex].quantity <= 0) {
          employee.products.splice(assignmentIndex, 1);
        }
      }
    }

    // Update employee holdings based on payment method
    if (!employee.holdings) {
      employee.holdings = { cash: 0, online: 0, total: 0 };
    }

    if (paymentMethod === "Cash") {
      employee.holdings.cash += pricing.totalAmount;
    } else {
      employee.holdings.online += pricing.totalAmount;
    }
    employee.holdings.total += pricing.totalAmount;

    await employee.save();

    // Populate and return the sale
    const populatedSale = await Sale.findById(sale._id)
      .populate("employee", "fullName profilePhoto")
      .populate("items.product", "title photo");

    return NextResponse.json(populatedSale, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating sale:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
