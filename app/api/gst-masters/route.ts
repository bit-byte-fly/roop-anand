import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import GstMaster from "@/models/GstMaster";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const status = request.nextUrl.searchParams.get("status");
    const query = status && status !== "all" ? { status } : {};
    const gstMasters = await GstMaster.find(query).sort({ rate: 1, name: 1 });
    return NextResponse.json(gstMasters);
  } catch (error) {
    console.error("Error fetching GST masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch GST masters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const name = body.name?.trim();
    const rate = Number(body.rate);

    if (!name) {
      return NextResponse.json(
        { error: "GST name is required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { error: "GST rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    const gstMaster = await GstMaster.create({
      name,
      rate,
      description: body.description?.trim() || undefined,
      status: body.status || "Active",
    });
    return NextResponse.json(gstMaster, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating GST master:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "A GST master with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create GST master" },
      { status: 500 }
    );
  }
}
