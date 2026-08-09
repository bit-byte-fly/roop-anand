import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { authOptions } from "@/lib/authOptions";

// GET all employees
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const employees = await Employee.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const {
      fullName,
      phoneNumber,
      email,
      gender,
      age,
      dateOfJoining,
      password,
      profilePhoto,
      address,
    } = body;

    const normalizedAddress = {
      street: address?.street?.trim(),
      city: address?.city?.trim(),
      state: address?.state?.trim(),
      pincode: address?.pincode?.trim(),
      country: address?.country?.trim() || "India",
    };

    if (
      !normalizedAddress.street ||
      !normalizedAddress.city ||
      !normalizedAddress.state ||
      !normalizedAddress.pincode
    ) {
      return NextResponse.json(
        { error: "Address, city, state, and pincode are required" },
        { status: 400 }
      );
    }

    if (!/^[1-9][0-9]{5}$/.test(normalizedAddress.pincode)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit pincode" },
        { status: 400 }
      );
    }

    // Check if phone number already exists
    const existingEmployee = await Employee.findOne({ phoneNumber });
    if (existingEmployee) {
      return NextResponse.json(
        { error: "An employee with this phone number already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const employee = await Employee.create({
      fullName,
      phoneNumber,
      email: email || undefined,
      gender,
      age,
      dateOfJoining: new Date(dateOfJoining),
      password: hashedPassword,
      profilePhoto: profilePhoto || undefined,
      address: normalizedAddress,
    });

    // Return employee without password
    const { password: _, ...employeeResponse } = employee.toObject();

    return NextResponse.json(employeeResponse, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating employee:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
