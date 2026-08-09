import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/organizationDefaults";
import { verifyMobileAuth } from "@/lib/verifyMobileAuth";
import OrganizationSettings from "@/models/OrganizationSettings";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    await connectDB();
    const savedSettings = await OrganizationSettings.findOne().lean();
    const settings = savedSettings || DEFAULT_ORGANIZATION_SETTINGS;
    const selectedLogo = settings.logo || DEFAULT_ORGANIZATION_SETTINGS.logo;
    const logo = new URL(selectedLogo, request.nextUrl.origin).href;

    return NextResponse.json({
      success: true,
      settings: {
        ...DEFAULT_ORGANIZATION_SETTINGS,
        ...settings,
        logo,
        address: {
          ...DEFAULT_ORGANIZATION_SETTINGS.address,
          ...settings.address,
        },
      },
    });
  } catch (error) {
    console.error("Mobile organization settings fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch organization settings" },
      { status: 500 }
    );
  }
}
