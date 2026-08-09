import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import GstMaster from "@/models/GstMaster";
import { authOptions } from "@/lib/authOptions";
import { deleteUploadThingFile } from "@/lib/utapi";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    void GstMaster;
    const product = await Product.findById(id).populate(
      "gst",
      "name rate status"
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Get current product to check for photo changes
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      photo,
      title,
      description,
      price,
      status,
      stockQuantity,
      gst,
    } = body;

    // Validate price logic if both are provided
    if (price?.lowestSellingPrice && price?.base) {
      if (price.lowestSellingPrice > price.base) {
        return NextResponse.json(
          { error: "Lowest selling price cannot be greater than base price" },
          { status: 400 }
        );
      }
    }

    if (gst) {
      const gstMaster = await GstMaster.findById(gst);
      const isExistingAssignment = currentProduct.gst?.toString() === gst;
      if (!gstMaster || (gstMaster.status !== "Active" && !isExistingAssignment)) {
        return NextResponse.json(
          { error: "Please select a valid active GST master" },
          { status: 400 }
        );
      }
    }

    // Handle photo changes - delete old photo from UploadThing if replaced or removed
    const oldPhoto = currentProduct.photo;
    const newPhoto = photo;

    if (oldPhoto && oldPhoto !== newPhoto) {
      await deleteUploadThingFile(oldPhoto);
    }

    const updateData: Record<string, unknown> = {
      title,
      description: description || undefined,
      status,
      stockQuantity,
      photo: photo || undefined,
    };

    // Handle price update
    if (price) {
      updateData.price = {
        base: price.base ?? currentProduct.price.base,
        lowestSellingPrice: price.lowestSellingPrice ?? currentProduct.price.lowestSellingPrice,
      };
    }

    if (gst !== undefined) {
      updateData.gst = gst || null;
    }

    // If photo is explicitly set to empty/null, remove it
    if (photo === "" || photo === null) {
      updateData.photo = undefined;
      await Product.findByIdAndUpdate(id, { $unset: { photo: 1 } });
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await product.populate("gst", "name rate status");
    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error updating product:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // First get the product to check for photo
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Delete photo from UploadThing if it exists
    if (product.photo) {
      await deleteUploadThingFile(product.photo);
    }

    // Now delete the product
    await Product.findByIdAndDelete(id);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
