import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import ProductRequest from "@/models/ProductRequest";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/product-requests/[id]
 * Get a single product request by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const productRequest = await ProductRequest.findById(id)
      .populate("customer", "name email phone authType address createdAt")
      .populate("assignedEmployee", "fullName phoneNumber email profilePhoto status")
      .populate("products.product", "title photo description price stockQuantity")
      .lean();

    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: productRequest,
    });
  } catch (error) {
    console.error("Error fetching product request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/product-requests/[id]
 * Update a product request (mainly for status updates)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Find the product request first
    const productRequest = await ProductRequest.findById(id);
    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    let hasChanges = false;

    // Handle status update
    if (body.status && ["pending", "ongoing", "delivered"].includes(body.status)) {
      productRequest.status = body.status;
      hasChanges = true;
    }

    // Assign or unassign this customer request to an employee.
    if (Object.prototype.hasOwnProperty.call(body, "assignedEmployeeId")) {
      if (!body.assignedEmployeeId) {
        productRequest.set("assignedEmployee", undefined);
        productRequest.set("assignedAt", undefined);
      } else {
        if (!Types.ObjectId.isValid(body.assignedEmployeeId)) {
          return NextResponse.json(
            { success: false, message: "Invalid employee ID" },
            { status: 400 }
          );
        }

        const employeeExists = await Employee.exists({
          _id: body.assignedEmployeeId,
        });
        if (!employeeExists) {
          return NextResponse.json(
            { success: false, message: "Employee not found" },
            { status: 404 }
          );
        }

        productRequest.set(
          "assignedEmployee",
          new Types.ObjectId(body.assignedEmployeeId)
        );
        productRequest.set("assignedAt", new Date());
      }
      productRequest.markModified("assignedEmployee");
      productRequest.markModified("assignedAt");
      hasChanges = true;
    }

    // Handle adding a new note
    if (body.note && typeof body.note === "string" && body.note.trim()) {
      // Migrate notes to array if it's still a string (old schema)
      if (!Array.isArray(productRequest.notes)) {
        productRequest.notes = [];
      }
      
      productRequest.notes.push({
        by: "admin",
        content: body.note.trim(),
        createdAt: new Date(),
      });
      hasChanges = true;
    }

    // Check if there's anything to update
    if (!hasChanges) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      );
    }

    await productRequest.save();

    // Fetch with populated data for response
    const updatedRequest = await ProductRequest.findById(id)
      .populate("customer", "name email phone authType")
      .populate("assignedEmployee", "fullName phoneNumber email profilePhoto status")
      .populate("products.product", "title photo price");

    return NextResponse.json({
      success: true,
      message: "Product request updated successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating product request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/product-requests/[id]
 * Delete a product request
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const productRequest = await ProductRequest.findByIdAndDelete(id);

    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/product-requests/[id]
 * Update or delete individual notes
 * Body: { action: 'update' | 'delete', noteIndex: number, content?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { action, noteIndex, content } = body;

    // Validate action
    if (!action || !["update", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Use 'update' or 'delete'" },
        { status: 400 }
      );
    }

    // Validate noteIndex
    if (typeof noteIndex !== "number" || noteIndex < 0) {
      return NextResponse.json(
        { success: false, message: "Valid noteIndex is required" },
        { status: 400 }
      );
    }

    // Find the product request
    const productRequest = await ProductRequest.findById(id);
    if (!productRequest) {
      return NextResponse.json(
        { success: false, message: "Product request not found" },
        { status: 404 }
      );
    }

    // Check if noteIndex is valid
    if (noteIndex >= productRequest.notes.length) {
      return NextResponse.json(
        { success: false, message: "Note not found at specified index" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      // Remove the note at the specified index
      productRequest.notes.splice(noteIndex, 1);
    } else if (action === "update") {
      // Validate content for update
      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json(
          { success: false, message: "Content is required for update" },
          { status: 400 }
        );
      }
      // Update the note content
      productRequest.notes[noteIndex].content = content.trim();
    }

    await productRequest.save();

    // Fetch with populated data for response
    const updatedRequest = await ProductRequest.findById(id)
      .populate("customer", "name email phone authType")
      .populate("assignedEmployee", "fullName phoneNumber email profilePhoto status")
      .populate("products.product", "title photo price");

    return NextResponse.json({
      success: true,
      message: `Note ${action === "delete" ? "deleted" : "updated"} successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
