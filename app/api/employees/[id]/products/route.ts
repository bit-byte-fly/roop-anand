import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Product from "@/models/Product";
import GstMaster from "@/models/GstMaster";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Assign product to employee
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    void GstMaster;

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: "Product ID and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    // Find the employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product has enough stock
    if (product.stockQuantity < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${product.stockQuantity} available.` },
        { status: 400 }
      );
    }

    // Deduct stock from product
    product.stockQuantity -= quantity;
    await product.save();

    // Add product to employee's products array
    employee.products.push({
      product: product._id,
      quantity,
      assignedAt: new Date(),
    });
    await employee.save();

    // Populate the products for the response
    const updatedEmployee = await Employee.findById(id)
      .populate({
        path: "products.product",
        populate: { path: "gst", select: "name rate status" },
      })
      .select("-password");

    return NextResponse.json({
      message: "Product assigned successfully",
      employee: updatedEmployee,
      productNewStock: product.stockQuantity,
    });
  } catch (error) {
    console.error("Error assigning product:", error);
    return NextResponse.json(
      { error: "Failed to assign product" },
      { status: 500 }
    );
  }
}

// GET - Get employee's assigned products
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    void GstMaster;

    const employee = await Employee.findById(id)
      .populate({
        path: "products.product",
        populate: { path: "gst", select: "name rate status" },
      })
      .select("-password");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const responseEmployee = employee.toObject();
    responseEmployee.products = responseEmployee.products.filter(
      (assignment) => assignment.product !== null
    );

    return NextResponse.json(responseEmployee);
  } catch (error) {
    console.error("Error fetching employee products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// DELETE - Remove assigned product from employee (return to stock)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const returnToStock = searchParams.get("returnToStock") !== "false";

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Find the assignment
    const assignmentIndex = employee.products.findIndex(
      (p) => p._id?.toString() === assignmentId
    );

    if (assignmentIndex === -1) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const assignment = employee.products[assignmentIndex];

    // Return stock to product if requested
    if (returnToStock) {
      const product = await Product.findById(assignment.product);
      if (product) {
        product.stockQuantity += assignment.quantity;
        await product.save();
      }
    }

    // Remove the assignment
    employee.products.splice(assignmentIndex, 1);
    await employee.save();

    const updatedEmployee = await Employee.findById(id)
      .populate({
        path: "products.product",
        populate: { path: "gst", select: "name rate status" },
      })
      .select("-password");

    return NextResponse.json({
      message: "Product assignment removed",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Error removing product assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}
