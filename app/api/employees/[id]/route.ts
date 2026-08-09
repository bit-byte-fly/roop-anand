import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import { authOptions } from "@/lib/authOptions";
import { deleteUploadThingFile } from "@/lib/utapi";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const employee = await Employee.findById(id).select("-password");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PUT update employee
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Get current employee to check for profile photo changes
    const currentEmployee = await Employee.findById(id);
    if (!currentEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

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
      status,
      address,
    } = body;

    let normalizedAddress: Record<string, string> | undefined;
    if (address !== undefined) {
      normalizedAddress = {
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
    }

    // Check if phone number is being changed and if it already exists
    if (phoneNumber) {
      const existingEmployee = await Employee.findOne({
        phoneNumber,
        _id: { $ne: id },
      });
      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this phone number already exists" },
          { status: 400 }
        );
      }
    }

    // Handle profile photo changes - delete old photo from UploadThing if replaced or removed
    const oldProfilePhoto = currentEmployee.profilePhoto;
    const newProfilePhoto = profilePhoto;
    
    if (oldProfilePhoto && oldProfilePhoto !== newProfilePhoto) {
      // Old photo exists and is being replaced or removed
      await deleteUploadThingFile(oldProfilePhoto);
    }

    const updateData: Record<string, unknown> = {
      fullName,
      phoneNumber,
      email: email || undefined,
      gender,
      age,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
      profilePhoto: profilePhoto || undefined,
      status,
      address: normalizedAddress,
    };

    // If profilePhoto is explicitly set to empty/null, remove it
    if (profilePhoto === "" || profilePhoto === null) {
      updateData.profilePhoto = undefined;
      // Use $unset to remove the field
      await Employee.findByIdAndUpdate(id, { $unset: { profilePhoto: 1 } });
    }

    // Only hash and update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Remove undefined values for the regular update
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error: unknown) {
    console.error("Error updating employee:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE employee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // First get the employee to check for profile photo
    const employee = await Employee.findById(id);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete profile photo from UploadThing if it exists
    if (employee.profilePhoto) {
      await deleteUploadThingFile(employee.profilePhoto);
    }

    // Now delete the employee
    await Employee.findByIdAndDelete(id);

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
