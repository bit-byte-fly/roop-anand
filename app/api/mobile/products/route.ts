import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/Employee';
import Product, { IProduct } from '@/models/Product';
import GstMaster, { IGstMaster } from '@/models/GstMaster';
import { verifyMobileAuth } from '@/lib/verifyMobileAuth';

// Populated product type
interface PopulatedProduct {
  product: IProduct & { gst?: IGstMaster | null };
  quantity: number;
  assignedAt: Date;
}

/**
 * GET /api/mobile/products
 * Get all products assigned to the authenticated employee
 * Requires: Authorization: Bearer <token>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const auth = verifyMobileAuth(request);

    if (!auth.success) {
      return auth.response;
    }

    const { user } = auth;

    await dbConnect();

    // Ensure Product model is registered
    void Product;
    void GstMaster;

    // Fetch employee with populated products
    const employee = await Employee.findById(user.id)
      .select('products')
      .populate({
        path: 'products.product',
        select: 'title description photo price status gst',
        populate: {
          path: 'gst',
          select: 'name rate status',
        },
      });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Transform the products to a cleaner format (filter out null products - orphaned references)
    const products = (employee.products as unknown as PopulatedProduct[])
      .filter((item) => item.product !== null)
      .map((item) => {
        const product = item.product;

        return {
          _id: product._id.toString(),
          title: product.title,
          description: product.description,
          photo: product.photo,
          price: product.price,
          status: product.status,
          gst: product.gst
            ? {
                _id: product.gst._id.toString(),
                name: product.gst.name,
                rate: product.gst.rate,
              }
            : null,
          assignedQuantity: item.quantity,
          assignedAt: item.assignedAt,
        };
      });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
