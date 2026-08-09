import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Sale, { ISale } from '@/models/Sale';
import Employee from '@/models/Employee';
import '@/models/Product';
import { verifyMobileAuth } from '@/lib/verifyMobileAuth';
import { calculateSalePricing } from '@/lib/salePricing';

// Type for populated product in sale items
interface PopulatedProduct {
  _id: Types.ObjectId;
  title: string;
  photo?: string;
}

// Type for populated sale item
interface PopulatedSaleItem {
  product: PopulatedProduct;
  productTitle: string;
  quantity: number;
  pricePerUnit: number;
  taxableAmount: number;
  gstName?: string;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
}

// Type for employee product assignment
interface ProductAssignment {
  product: Types.ObjectId;
  quantity: number;
}

/**
 * GET /api/mobile/sales
 * Get all sales for the authenticated employee
 * Requires: Authorization: Bearer <token>
 * Query params: page, limit, paymentMethod, productId
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

    // Get query params for filtering and pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const paymentMethod = searchParams.get('paymentMethod');
    const productId = searchParams.get('productId');

    // Build query
    const query: Record<string, unknown> = { employee: user.id };
    
    // Filter by payment method
    if (paymentMethod && ['Cash', 'Online'].includes(paymentMethod)) {
      query.paymentMethod = paymentMethod;
    }

    // Filter by product (sales containing this product)
    if (productId) {
      query['items.product'] = productId;
    }

    // Get total count for pagination
    const totalCount = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate('items.product', 'title photo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform response
    const formattedSales = sales.map((sale) => {
      const items = (sale.items as unknown as PopulatedSaleItem[]).map((item) => ({
        productId: item.product?._id?.toString() || null,
        productTitle: item.productTitle,
        productPhoto: item.product?.photo || null,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        taxableAmount: item.taxableAmount ?? item.totalPrice,
        gstName: item.gstName,
        gstRate: item.gstRate || 0,
        gstAmount: item.gstAmount || 0,
        totalPrice: item.totalPrice,
      }));

      return {
        _id: sale._id.toString(),
        items,
        customer: sale.customer,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal ?? sale.totalAmount,
        totalGst: sale.totalGst || 0,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      sales: formattedSales,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + sales.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Sales fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/sales
 * Create a new sale for the authenticated employee
 * Requires: Authorization: Bearer <token>
 * Body: {
 *   items: Array<{ productId: string, productTitle: string, quantity: number, pricePerUnit: number }>,
 *   customer: { name: string, phone: string, email?: string, address?: string },
 *   paymentMethod: 'Cash' | 'Online'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const auth = verifyMobileAuth(request);
    if (!auth.success) {
      return auth.response;
    }

    const { user } = auth;
    await dbConnect();

    const body = await request.json();
    const { items, customer, paymentMethod } = body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        return NextResponse.json(
          { success: false, message: `Item ${i + 1}: Product is required` },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { success: false, message: `Item ${i + 1}: Quantity must be at least 1` },
          { status: 400 }
        );
      }
      if (!item.pricePerUnit || item.pricePerUnit < 0) {
        return NextResponse.json(
          { success: false, message: `Item ${i + 1}: Price must be a valid amount` },
          { status: 400 }
        );
      }
    }

    // Validate customer
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer information is required' },
        { status: 400 }
      );
    }

    if (!customer.name || customer.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer name is required' },
        { status: 400 }
      );
    }

    if (!customer.phone || customer.phone.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer phone is required' },
        { status: 400 }
      );
    }

    const billingAddress = customer.billingAddress?.trim() || customer.address?.trim();
    if (!billingAddress) {
      return NextResponse.json(
        { success: false, message: 'Billing address is required' },
        { status: 400 }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(customer.phone.replace(/\D/g, '').slice(-10))) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!paymentMethod || !['Cash', 'Online'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: 'Payment method must be "Cash" or "Online"' },
        { status: 400 }
      );
    }

    // Get employee with products
    const employee = await Employee.findById(user.id);
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check employee has all products with sufficient quantity
    const employeeProducts = employee.products as unknown as ProductAssignment[];
    const employeeProductMap = new Map<string, number>();
    
    for (const p of employeeProducts) {
      employeeProductMap.set(p.product.toString(), p.quantity);
    }

    const insufficientItems: string[] = [];
    const missingItems: string[] = [];

    for (const item of items) {
      const availableQty = employeeProductMap.get(item.productId);
      
      if (availableQty === undefined) {
        missingItems.push(item.productTitle || item.productId);
      } else if (availableQty < item.quantity) {
        insufficientItems.push(`${item.productTitle}: need ${item.quantity}, have ${availableQty}`);
      }
    }

    if (missingItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `You don't have these products assigned: ${missingItems.join(', ')}`,
          missingItems,
        },
        { status: 400 }
      );
    }

    if (insufficientItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Insufficient stock for: ${insufficientItems.join('; ')}`,
          insufficientItems,
        },
        { status: 400 }
      );
    }

    const pricing = await calculateSalePricing(items);
    if (pricing.missingProducts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Products not found: ${pricing.missingProducts.join(', ')}`,
          missingItems: pricing.missingProducts,
        },
        { status: 400 }
      );
    }

    // Create the sale
    const sale = await Sale.create({
      employee: user.id,
      items: pricing.saleItems,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email?.trim() || undefined,
        billingAddress,
      },
      paymentMethod,
      subtotal: pricing.subtotal,
      totalGst: pricing.totalGst,
      totalAmount: pricing.totalAmount,
    }) as ISale;

    // Deduct quantities from employee's products
    for (const item of items) {
      const assignmentIndex = employeeProducts.findIndex(
        (p) => p.product.toString() === item.productId
      );

      if (assignmentIndex !== -1) {
        employee.products[assignmentIndex].quantity -= item.quantity;

        // Remove assignment if quantity becomes 0
        if (employee.products[assignmentIndex].quantity <= 0) {
          employee.products.splice(assignmentIndex, 1);
        }
      }
    }

    // Update employee holdings based on payment method
    if (!employee.holdings) {
      employee.holdings = { cash: 0, online: 0, total: 0 };
    }

    if (paymentMethod === 'Cash') {
      employee.holdings.cash += pricing.totalAmount;
    } else {
      employee.holdings.online += pricing.totalAmount;
    }
    employee.holdings.total += pricing.totalAmount;

    await employee.save();

    return NextResponse.json({
      success: true,
      message: 'Sale recorded successfully',
      sale: {
        _id: sale._id.toString(),
        items: pricing.saleItems.map((item) => ({
          productId: item.product,
          productTitle: item.productTitle,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          taxableAmount: item.taxableAmount,
          gstName: item.gstName,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          totalPrice: item.totalPrice,
        })),
        customer: sale.customer,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        totalGst: sale.totalGst,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
      },
      updatedHoldings: {
        cash: employee.holdings.cash,
        online: employee.holdings.online,
        total: employee.holdings.total,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
