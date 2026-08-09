import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyMobileAuth } from "@/lib/verifyMobileAuth";
import Customer from "@/models/Customer";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    const phone = request.nextUrl.searchParams.get("phone") || "";
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(digits)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    await connectDB();
    const phonePattern = new RegExp(`${digits.split("").join("\\D*")}$`);
    const customer = await Customer.findOne({ phone: phonePattern })
      .select("name phone email address")
      .lean();

    return NextResponse.json({
      success: true,
      customer: customer
        ? {
            id: customer._id.toString(),
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
          }
        : null,
    });
  } catch (error) {
    console.error("Customer phone lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to search customer" },
      { status: 500 }
    );
  }
}
