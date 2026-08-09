import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductRequest from "@/models/ProductRequest";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import { verifyCustomerAuth } from "@/lib/verifyCustomerAuth";

/**
 * POST /api/mobile/customer/requests
 * Submit a new product request (requires customer auth)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify customer authentication
    const auth = verifyCustomerAuth(request);
    if (!auth.success) {
      return auth.response;
    }

    await connectDB();

    const body = await request.json();
    const { products, name, phone, email, address, notes } = body;

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one product is required" },
        { status: 400 },
      );
    }

    // Validate each product
    for (const item of products) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Each product must have valid product ID and quantity",
          },
          { status: 400 },
        );
      }

      // Check if product exists and is active
      const productExists = await Product.findOne({
        _id: item.product,
        status: "Active",
      });

      if (!productExists) {
        return NextResponse.json(
          {
            success: false,
            message: `Product ${item.product} not found or inactive`,
          },
          { status: 400 },
        );
      }
    }

    // Get customer for fallback details
    const customer = await Customer.findById(auth.customer.id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 },
      );
    }

    // Build customer details snapshot (use provided or fall back to customer record)
    const customerDetails = {
      name: name || customer.name,
      phone: phone || customer.phone,
      email: email || customer.email,
      address: address || customer.address,
    };

    // Validate required customer details
    if (!customerDetails.name || !customerDetails.phone) {
      return NextResponse.json(
        { success: false, message: "Name and phone are required" },
        { status: 400 },
      );
    }

    // Create the product request
    const productRequest = await ProductRequest.create({
      customer: new Types.ObjectId(auth.customer.id),
      products: products.map((item: { product: string; quantity: number }) => ({
        product: new Types.ObjectId(item.product),
        quantity: item.quantity,
      })),
      status: "pending",
      customerDetails,
      notes,
    });

    // Populate products for response
    await productRequest.populate("products.product", "title photo price");

    return NextResponse.json({
      success: true,
      message: "Product request submitted successfully",
      request: {
        id: productRequest._id,
        products: productRequest.products.map((item) => ({
          product: {
            id: item.product._id,
            title: (item.product as unknown as { title: string }).title,
            photo: (item.product as unknown as { photo?: string }).photo,
          },
          quantity: item.quantity,
        })),
        status: productRequest.status,
        customerDetails: productRequest.customerDetails,
        notes: productRequest.notes,
        createdAt: productRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/mobile/customer/requests
 * Get customer's own requests (requires customer auth)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify customer authentication
    const auth = verifyCustomerAuth(request);
    if (!auth.success) {
      return auth.response;
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      customer: new Types.ObjectId(auth.customer.id),
    };

    if (
      status &&
      ["pending", "assigned", "ongoing", "delivered"].includes(status)
    ) {
      query.status = status;
    }

    // Get total count
    const total = await ProductRequest.countDocuments(query);

    // Fetch requests
    const requests = await ProductRequest.find(query)
      .populate("products.product", "title photo price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format requests
    const formattedRequests = requests.map((req) => ({
      id: req._id,
      products: req.products
        .filter((item) => item.product != null)
        .map((item) => ({
          product: {
            id: (item.product as unknown as { _id: string })._id,
            title: (item.product as unknown as { title: string }).title,
            photo: (item.product as unknown as { photo?: string }).photo,
            price: (item.product as unknown as { price: { base: number } })
              .price?.base,
          },
          quantity: item.quantity,
        })),
      status: req.status,
      customerDetails: req.customerDetails,
      notes: req.notes,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
