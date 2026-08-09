import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import { verifyMobileAuth } from "@/lib/verifyMobileAuth";
import ProductRequest from "@/models/ProductRequest";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const validateRequestId = (id: string) => Types.ObjectId.isValid(id);

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    if (!validateRequestId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid request ID" },
        { status: 400 }
      );
    }

    await connectDB();
    const productRequest = await ProductRequest.findOne({
      _id: id,
      assignedEmployee: auth.user.id,
    })
      .select("notes customerDetails status")
      .lean();

    if (!productRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Assigned request not found or not assigned to you",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: productRequest.notes || [],
      customerDetails: productRequest.customerDetails,
      status: productRequest.status,
    });
  } catch (error) {
    console.error("Assigned request messages fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyMobileAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    if (!validateRequestId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid request ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    const content = body.content.trim();
    if (content.length > 500) {
      return NextResponse.json(
        { success: false, message: "Message cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const message = {
      by: "employee" as const,
      senderName: auth.user.fullName,
      content,
      createdAt: new Date(),
    };
    const productRequest = await ProductRequest.findOneAndUpdate(
      { _id: id, assignedEmployee: auth.user.id },
      { $push: { notes: message } },
      { new: true, runValidators: true }
    )
      .select("notes")
      .lean();

    if (!productRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Assigned request not found or not assigned to you",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message sent",
      sentMessage: message,
      messages: productRequest.notes || [],
    });
  } catch (error) {
    console.error("Assigned request message send error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send message" },
      { status: 500 }
    );
  }
}
