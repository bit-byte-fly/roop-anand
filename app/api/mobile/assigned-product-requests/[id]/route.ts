import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import { verifyMobileAuth } from "@/lib/verifyMobileAuth";
import ProductRequest from "@/models/ProductRequest";
import "@/models/Customer";
import "@/models/Product";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const allowedStatuses = ["pending", "ongoing", "delivered"] as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid request ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { status?: string };
    if (
      !body.status ||
      !allowedStatuses.includes(
        body.status as (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid request status" },
        { status: 400 }
      );
    }

    await connectDB();
    const updatedRequest = await ProductRequest.findOneAndUpdate(
      { _id: id, assignedEmployee: auth.user.id },
      { $set: { status: body.status } },
      { new: true, runValidators: true }
    )
      .populate("customer", "name phone email address")
      .populate(
        "products.product",
        "title photo description price stockQuantity"
      )
      .lean();

    if (!updatedRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Assigned request not found or not assigned to you",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Request status updated",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Assigned product request status update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update request status" },
      { status: 500 }
    );
  }
}
