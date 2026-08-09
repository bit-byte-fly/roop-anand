import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import GstMaster from "@/models/GstMaster";

/**
 * GET /api/mobile/customer/products
 * List available products for customers (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    void GstMaster;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build query - only show active products with stock
    const query: Record<string, unknown> = {
      status: "Active",
    };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Fetch products
    const products = await Product.find(query)
      .select("photo title description price stockQuantity gst")
      .populate("gst", "name rate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format products
    const formattedProducts = products.map((product) => ({
      id: product._id,
      photo: product.photo,
      title: product.title,
      description: product.description,
      price: product.price.base,
      inStock: product.stockQuantity > 0,
      stockQuantity: product.stockQuantity,
      gst: product.gst || null,
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
