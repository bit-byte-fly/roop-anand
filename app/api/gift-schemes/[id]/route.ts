import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import GiftScheme from "@/models/GiftScheme";
import { validateGiftScheme } from "../route";

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { id } = await params;
    const validation = await validateGiftScheme(await request.json(), id);
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const scheme = await GiftScheme.findByIdAndUpdate(id, validation.value, { new: true, runValidators: true }).populate("products", "title photo");
    if (!scheme) return NextResponse.json({ error: "Gift scheme not found" }, { status: 404 });
    return NextResponse.json(scheme);
  } catch (error) {
    console.error("Error updating gift scheme:", error);
    return NextResponse.json({ error: "Failed to update gift scheme" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { id } = await params;
    const scheme = await GiftScheme.findByIdAndDelete(id);
    if (!scheme) return NextResponse.json({ error: "Gift scheme not found" }, { status: 404 });
    return NextResponse.json({ message: "Gift scheme deleted" });
  } catch (error) {
    console.error("Error deleting gift scheme:", error);
    return NextResponse.json({ error: "Failed to delete gift scheme" }, { status: 500 });
  }
}
