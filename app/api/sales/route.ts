import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Employee from "@/models/Employee";
import { authOptions } from "@/lib/authOptions";
import { calculateSalePricing } from "@/lib/salePricing";

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

    const query = employeeId ? { employee: employeeId } : {};

    const sales = await Sale.find(query)
      .populate("employee", "fullName profilePhoto")
      .populate("items.product", "title photo")
      .sort({ createdAt: -1 });

    return NextResponse.json(sales);
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
