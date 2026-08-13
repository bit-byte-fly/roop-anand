import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Employee from '@/models/Employee';
import '@/models/Product';
import { verifyMobileAuth } from '@/lib/verifyMobileAuth';

interface PopulatedProduct {
  _id: Types.ObjectId;
  photo?: string;
}

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

/** PATCH /api/mobile/sales/:id/payment - collect payment against an udhar sale. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    const { user } = auth;
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid sale ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const paymentMethod = body.paymentMethod;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Payment amount must be greater than zero' },
        { status: 400 }
      );
    }
    if (!['Cash', 'Online'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: 'Payment method must be "Cash" or "Online"' },
        { status: 400 }
      );
    }

    await dbConnect();
    const [sale, employee] = await Promise.all([
      Sale.findOne({ _id: id, employee: user.id }),
      Employee.findById(user.id),
    ]);
    if (!sale) {
      return NextResponse.json(
        { success: false, message: 'Sale not found' },
        { status: 404 }
      );
    }
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      );
    }

    // Mongoose applies schema defaults while hydrating old documents. Detect the
    // resulting paid-₹0 shape so sales created before this feature stay paid.
    const isLegacyPaidSale =
      sale.paymentStatus === 'Paid' &&
      sale.paidAmount === 0 &&
      sale.remainingAmount === 0 &&
      (sale.payments || []).length === 0 &&
      sale.totalAmount > 0;
    const currentPaidAmount = isLegacyPaidSale
      ? sale.totalAmount
      : (sale.paidAmount ?? sale.totalAmount);
    const currentRemainingAmount = isLegacyPaidSale
      ? 0
      : (sale.remainingAmount ?? Math.max(0, sale.totalAmount - currentPaidAmount));
    if (currentRemainingAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'This sale is already fully paid' },
        { status: 409 }
      );
    }
    if (amount > currentRemainingAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment cannot exceed the remaining amount of ${currentRemainingAmount}`,
        },
        { status: 400 }
      );
    }

    const nextPaidAmount = currentPaidAmount + amount;
    const nextRemainingAmount = Math.max(0, currentRemainingAmount - amount);
    const updatedSale = await Sale.findOneAndUpdate(
      {
        _id: sale._id,
        employee: user.id,
        paidAmount: currentPaidAmount,
        remainingAmount: currentRemainingAmount,
      },
      {
        $set: {
          paymentStatus: nextRemainingAmount === 0 ? 'Paid' : 'Partial',
        },
        $inc: {
          paidAmount: amount,
          remainingAmount: -amount,
        },
        $push: {
          payments: {
            amount,
            method: paymentMethod,
            collectedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!updatedSale) {
      return NextResponse.json(
        { success: false, message: 'Sale changed; refresh and try again' },
        { status: 409 }
      );
    }

    // Increment holdings atomically so simultaneous collections cannot overwrite
    // one another after the sale-level optimistic update above.
    const updatedEmployee = await Employee.findByIdAndUpdate(
      user.id,
      paymentMethod === 'Cash'
        ? { $inc: { 'holdings.cash': amount, 'holdings.total': amount } }
        : { $inc: { 'holdings.online': amount, 'holdings.total': amount } },
      { new: true, runValidators: true }
    );
    if (!updatedEmployee) {
      throw new Error('Employee disappeared while recording payment');
    }
    await updatedSale.populate('items.product', 'title photo');

    const items = (updatedSale.items as unknown as PopulatedSaleItem[]).map(
      (item) => ({
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
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      sale: {
        _id: updatedSale._id.toString(),
        items,
        customer: updatedSale.customer,
        paymentMethod: updatedSale.paymentMethod,
        subtotal: updatedSale.subtotal,
        totalGst: updatedSale.totalGst,
        totalAmount: updatedSale.totalAmount,
        paidAmount: nextPaidAmount,
        remainingAmount: nextRemainingAmount,
        paymentStatus: nextRemainingAmount === 0 ? 'Paid' : 'Partial',
        payments: updatedSale.payments,
        createdAt: updatedSale.createdAt,
      },
      updatedHoldings: updatedEmployee.holdings,
    });
  } catch (error) {
    console.error('Sale payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
