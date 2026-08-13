import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getGiftEligibility } from "@/lib/giftEligibility";
import { verifyCustomerAuth } from "@/lib/verifyCustomerAuth";
import Customer from "@/models/Customer";
import GiftScheme from "@/models/GiftScheme";

interface PublicGiftScheme {
  _id: { toString(): string };
  products: Array<{
    _id: { toString(): string };
    title: string;
    photo?: string;
  }>;
  giftType: "Cash" | "TV" | "Fridge" | "Other";
  giftName: string;
  cashAmount?: number;
  minQuantity: number;
  maxQuantity: number;
  expiresAt?: Date;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const hasAuthorization = Boolean(request.headers.get("authorization"));

    if (!hasAuthorization) {
      const schemes = await GiftScheme.find({
        status: "Active",
        $or: [
          { expiresAt: { $gte: new Date() } },
          { expiresAt: { $exists: false } },
        ],
      })
        .populate("products", "title photo")
        .sort({ minQuantity: 1 })
        .lean<PublicGiftScheme[]>();

      const offers = schemes.map((scheme) => ({
        id: scheme._id.toString(),
        schemeId: scheme._id.toString(),
        products: scheme.products.map((product) => ({
          id: product._id.toString(),
          title: product.title,
          photo: product.photo,
        })),
        purchasedQuantity: 0,
        minQuantity: scheme.minQuantity,
        maxQuantity: scheme.maxQuantity,
        remainingQuantity: scheme.minQuantity,
        eligible: false,
        giftType: scheme.giftType,
        giftName: scheme.giftName,
        cashAmount: scheme.cashAmount,
        expiresAt: scheme.expiresAt,
      }));

      return NextResponse.json({
        success: true,
        gifts: offers,
        eligibleGifts: [],
        upcomingGifts: offers,
        eligibleCount: 0,
        personalized: false,
      });
    }

    const auth = verifyCustomerAuth(request);
    if (!auth.success) return auth.response;
    const customer = await Customer.findById(auth.customer.id).select("phone name");
    if (!customer) return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });

    const gifts = await getGiftEligibility(customer.phone);
    const eligibleGifts = gifts.filter((gift) => gift.eligible);
    const upcomingGifts = gifts
      .filter((gift) => !gift.eligible && gift.purchasedQuantity < gift.minQuantity)
      .sort((a, b) => a.remainingQuantity - b.remainingQuantity);
    return NextResponse.json({ success: true, gifts, eligibleGifts, upcomingGifts, eligibleCount: eligibleGifts.length, personalized: true });
  } catch (error) {
    console.error("Error fetching customer gifts:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch gifts" }, { status: 500 });
  }
}
