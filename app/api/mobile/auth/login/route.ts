import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/Employee';
import { comparePassword } from '@/lib/auth';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find employee by email
    const employee = await Employee.findOne({ email: email.toLowerCase() });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, employee.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: employee._id.toString(),
      email: email.toLowerCase(),
      phoneNumber: employee.phoneNumber,
      fullName: employee.fullName,
    });

    // Update employee status to Online
    await Employee.findByIdAndUpdate(employee._id, { status: 'Online' });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: employee._id.toString(),
        fullName: employee.fullName,
        phoneNumber: employee.phoneNumber,
        email: employee.email,
        profilePhoto: employee.profilePhoto,
        address: employee.address,
        status: 'Online',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
