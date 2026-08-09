import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyMobileAuth } from "@/lib/verifyMobileAuth";
import ProductRequest from "@/models/ProductRequest";
import "@/models/Customer";
import "@/models/Product";

const allowedStatuses = ["pending", "assigned", "ongoing", "delivered"];

export async function GET(request: NextRequest) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    await connectDB();

    const page = Math.max(
      1,
      Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10)
    );
    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)
      )
    );
    const status = request.nextUrl.searchParams.get("status");
    const query: Record<string, unknown> = {
      assignedEmployee: auth.user.id,
    };

    if (status && allowedStatuses.includes(status)) query.status = status;

    const [requests, totalCount] = await Promise.all([
      ProductRequest.find(query)
        .populate("customer", "name phone email address")
        .populate(
          "products.product",
          "title photo description price stockQuantity"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductRequest.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Assigned product requests fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch assigned product requests" },
      { status: 500 }
    );
  }
}
