import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/Employee';
import '@/models/Product'; // Ensure Product model is registered
import { verifyMobileAuth } from '@/lib/verifyMobileAuth';

/**
 * GET /api/mobile/profile
 * Protected route example - Get current user profile
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

    // Fetch full employee data
    const employee = await Employee.findById(user.id)
      .select('-password -otp -otpExpiry')
      .populate('products.product', 'name price');

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: employee._id.toString(),
        fullName: employee.fullName,
        phoneNumber: employee.phoneNumber,
        email: employee.email,
        gender: employee.gender,
        age: employee.age,
        dateOfJoining: employee.dateOfJoining,
        profilePhoto: employee.profilePhoto,
        address: employee.address,
        status: employee.status,
        holdings: employee.holdings,
        products: employee.products,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
