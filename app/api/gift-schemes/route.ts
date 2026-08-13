import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import { getGiftEligibility } from "@/lib/giftEligibility";
import GiftScheme, { GiftType } from "@/models/GiftScheme";
import Product from "@/models/Product";

const giftTypes: GiftType[] = ["Cash", "TV", "Fridge", "Other"];

export async function validateGiftScheme(body: Record<string, unknown>, excludedId?: string) {
  const products = Array.isArray(body.products)
    ? [...new Set(body.products.map((product) => String(product)).filter(Boolean))]
    : [];
  const giftType = body.giftType as GiftType;
  const minQuantity = Number(body.minQuantity);
  const maxQuantity = Number(body.maxQuantity);
  const cashAmount = body.cashAmount === undefined || body.cashAmount === "" ? undefined : Number(body.cashAmount);
  const giftName = giftType === "Cash" ? "Cash Reward" : String(body.giftName || giftType || "").trim();
  const expiryInput = String(body.expiresAt || "").trim();
  const expiresAt = !expiryInput
    ? undefined
    : /^\d{4}-\d{2}-\d{2}$/.test(expiryInput)
      ? new Date(`${expiryInput}T23:59:59.999+05:30`)
      : new Date(expiryInput);

  if (products.length === 0) return { error: "Select at least one product" } as const;
  if ((await Product.countDocuments({ _id: { $in: products } })) !== products.length) return { error: "One or more selected products are invalid" } as const;
  if (!giftTypes.includes(giftType)) return { error: "Select a valid gift type" } as const;
  if (!Number.isInteger(minQuantity) || minQuantity < 1) return { error: "Minimum quantity must be a whole number of at least 1" } as const;
  if (!Number.isInteger(maxQuantity) || maxQuantity < minQuantity) return { error: "Maximum quantity must be at least the minimum quantity" } as const;
  if (!giftName) return { error: "Gift name is required" } as const;
  if (giftType === "Cash" && (!cashAmount || cashAmount <= 0)) return { error: "Enter a cash reward amount greater than zero" } as const;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Select a valid gift expiry date" } as const;
  if (expiresAt && expiresAt.getTime() < Date.now()) return { error: "Gift expiry date cannot be in the past" } as const;

  const overlapQuery: Record<string, unknown> = {
    products: { $all: products, $size: products.length },
    minQuantity: { $lte: maxQuantity },
    maxQuantity: { $gte: minQuantity },
  };
  if (excludedId) overlapQuery._id = { $ne: excludedId };
  if (await GiftScheme.exists(overlapQuery)) {
    return { error: "This product already has a gift scheme overlapping that quantity range" } as const;
  }

  return { value: {
    products,
    giftType,
    giftName,
    cashAmount: giftType === "Cash" ? cashAmount : undefined,
    minQuantity,
    maxQuantity,
    status: body.status === "Inactive" ? "Inactive" : "Active",
    expiresAt,
  } } as const;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const [schemes, eligibility] = await Promise.all([
      GiftScheme.find().populate("products", "title photo").sort({ createdAt: -1 }),
      getGiftEligibility(),
    ]);
    return NextResponse.json({ schemes, eligibleCustomers: eligibility.filter((entry) => entry.eligible) });
  } catch (error) {
    console.error("Error fetching gift schemes:", error);
    return NextResponse.json({ error: "Failed to fetch gift schemes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const validation = await validateGiftScheme(await request.json());
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const scheme = await GiftScheme.create(validation.value);
    await scheme.populate("products", "title photo");
    return NextResponse.json(scheme, { status: 201 });
  } catch (error) {
    console.error("Error creating gift scheme:", error);
    return NextResponse.json({ error: "Failed to create gift scheme" }, { status: 500 });
  }
}
