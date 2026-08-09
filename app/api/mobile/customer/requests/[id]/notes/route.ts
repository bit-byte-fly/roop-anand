import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductRequest from "@/models/ProductRequest";
import "@/models/Employee";
import { verifyCustomerAuth } from "@/lib/verifyCustomerAuth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/mobile/customer/requests/[id]/notes
 * Add a note to a product request (customer)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify customer authentication
    const auth = verifyCustomerAuth(request);
    if (!auth.success) {
      return auth.response;
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    if (content.trim().length > 500) {
      return NextResponse.json(
        { success: false, message: "Message cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    // Find the product request and verify ownership
    const productRequest = await ProductRequest.findOne({
      _id: id,
      customer: auth.customer.id,
    });

    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    // Add the note
    const newNote = {
      by: "customer" as const,
      content: content.trim(),
      createdAt: new Date(),
    };

    const updatedRequest = await ProductRequest.findByIdAndUpdate(
      id,
      { $push: { notes: newNote } },
      { new: true, runValidators: true }
    )
      .populate("products.product", "title photo price")
      .populate("assignedEmployee", "fullName")
      .lean();

    const assignedEmployee = updatedRequest?.assignedEmployee as unknown as
      | { fullName?: string }
      | undefined;

    return NextResponse.json({
      success: true,
      message: "Note added successfully",
      note: newNote,
      notes: updatedRequest?.notes || [],
      employeeName: assignedEmployee?.fullName,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/customer/requests/[id]/notes
 * Get all notes for a product request (customer)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify customer authentication
    const auth = verifyCustomerAuth(request);
    if (!auth.success) {
      return auth.response;
    }

    await connectDB();

    const { id } = await params;

    // Find the product request and verify ownership
    const productRequest = await ProductRequest.findOne({
      _id: id,
      customer: auth.customer.id,
    })
      .populate("assignedEmployee", "fullName")
      .lean();

    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    const assignedEmployee = productRequest.assignedEmployee as unknown as
      | { fullName?: string }
      | undefined;

    return NextResponse.json({
      success: true,
      notes: productRequest.notes || [],
      employeeName: assignedEmployee?.fullName,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
