import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductRequest from "@/models/ProductRequest";
// Import models to register schemas for populate
import "@/models/Customer";
import "@/models/Employee";
import "@/models/Product";

/**
 * GET /api/product-requests
 * List all product requests with filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (
      status &&
      ["pending", "assigned", "ongoing", "delivered"].includes(status)
    ) {
      query.status = status;
    }

    if (productId) {
      query["products.product"] = new Types.ObjectId(productId);
    }

    if (search) {
      query["customerDetails.name"] = { $regex: search, $options: "i" };
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count
    const total = await ProductRequest.countDocuments(query);

    // Fetch requests with populated data
    const requests = await ProductRequest.find(query)
      .populate("customer", "name email phone authType")
      .populate("assignedEmployee", "fullName phoneNumber email profilePhoto status")
      .populate("products.product", "title photo price")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get status counts for filters
    const statusCounts = await ProductRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts = {
      pending: 0,
      assigned: 0,
      ongoing: 0,
      delivered: 0,
      total: 0,
    };

    statusCounts.forEach((item) => {
      counts[item._id as keyof typeof counts] = item.count;
      counts.total += item.count;
    });

    return NextResponse.json({
      success: true,
      requests,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching product requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
