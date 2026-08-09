import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import GstMaster from "@/models/GstMaster";
import Product from "@/models/Product";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json(
          { error: "GST name is required" },
          { status: 400 }
        );
      }
      update.name = name;
    }
    if (body.rate !== undefined) {
      const rate = Number(body.rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "GST rate must be between 0 and 100" },
          { status: 400 }
        );
      }
      update.rate = rate;
    }
    if (body.description !== undefined) {
      update.description = body.description?.trim() || undefined;
    }
    if (body.status !== undefined) update.status = body.status;

    const gstMaster = await GstMaster.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!gstMaster) {
      return NextResponse.json(
        { error: "GST master not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(gstMaster);
  } catch (error: unknown) {
    console.error("Error updating GST master:", error);
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
      { error: "Failed to update GST master" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const assignedProducts = await Product.countDocuments({ gst: id });
    if (assignedProducts > 0) {
      return NextResponse.json(
        {
          error: `This GST master is assigned to ${assignedProducts} product(s). Remove those assignments before deleting it.`,
        },
        { status: 409 }
      );
    }

    const gstMaster = await GstMaster.findByIdAndDelete(id);
    if (!gstMaster) {
      return NextResponse.json(
        { error: "GST master not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "GST master deleted successfully" });
  } catch (error) {
    console.error("Error deleting GST master:", error);
    return NextResponse.json(
      { error: "Failed to delete GST master" },
      { status: 500 }
    );
  }
}
