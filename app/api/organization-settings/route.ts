import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import OrganizationSettings from "@/models/OrganizationSettings";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/organizationDefaults";

// GET - Get organization settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get the first (and only) organization settings document
    const settings = await OrganizationSettings.findOne();

    if (!settings) {
      return NextResponse.json(DEFAULT_ORGANIZATION_SETTINGS);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching organization settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    );
  }
}

// PUT - Update organization settings (create if not exists)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();

    // Validate required fields
    if (!data.companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Find existing settings or create new
    let settings = await OrganizationSettings.findOne();

    if (settings) {
      // Update existing
      settings.companyName = data.companyName;
      settings.logo = data.logo || undefined;
      settings.address = {
        street: data.address?.street || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        pincode: data.address?.pincode || "",
        country: data.address?.country || "India",
      };
      settings.phone = data.phone || undefined;
      settings.email = data.email || undefined;
      settings.gstin = data.gstin || undefined;
      settings.pan = data.pan || undefined;
      settings.bankDetails = data.bankDetails
        ? {
            accountName: data.bankDetails.accountName || undefined,
            accountNumber: data.bankDetails.accountNumber || undefined,
            bankName: data.bankDetails.bankName || undefined,
            ifscCode: data.bankDetails.ifscCode || undefined,
          }
        : undefined;

      await settings.save();
    } else {
      // Create new
      settings = await OrganizationSettings.create({
        companyName: data.companyName,
        logo: data.logo || undefined,
        address: {
          street: data.address?.street || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          pincode: data.address?.pincode || "",
          country: data.address?.country || "India",
        },
        phone: data.phone || undefined,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        bankDetails: data.bankDetails || undefined,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating organization settings:", error);
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 }
    );
  }
}
