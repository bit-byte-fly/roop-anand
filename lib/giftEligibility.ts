import GiftScheme from "@/models/GiftScheme";
import Sale from "@/models/Sale";

interface SaleQuantityRow {
  _id: { phone: string; product: unknown };
  customerName: string;
  customerEmail?: string;
  quantity: number;
}

interface PopulatedGiftScheme {
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
  status: "Active" | "Inactive";
  expiresAt?: Date;
}

const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, "").slice(-10);

const phonePattern = (phone: string) => {
  const digits = normalizePhone(phone);
  return digits ? `${digits.split("").join("\\D*")}$` : "a^";
};

export async function getGiftEligibility(customerPhone?: string) {
  const match = customerPhone
    ? { "customer.phone": { $regex: phonePattern(customerPhone) } }
    : {};

  const [schemes, saleRows] = await Promise.all([
    GiftScheme.find({
      status: "Active",
      $or: [
        { expiresAt: { $gte: new Date() } },
        { expiresAt: { $exists: false } },
      ],
    })
      .populate("products", "title photo")
      .sort({ minQuantity: 1 })
      .lean<PopulatedGiftScheme[]>(),
    Sale.aggregate<SaleQuantityRow>([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: { phone: "$customer.phone", product: "$items.product" },
          customerName: { $last: "$customer.name" },
          customerEmail: { $last: "$customer.email" },
          quantity: { $sum: "$items.quantity" },
        },
      },
    ]),
  ]);

  const totals = new Map<
    string,
    {
      phone: string;
      customerName: string;
      customerEmail?: string;
      productId: string;
      quantity: number;
    }
  >();

  for (const row of saleRows) {
    const phone = normalizePhone(row._id.phone || "");
    const productId = String(row._id.product);
    const key = `${phone}:${productId}`;
    const current = totals.get(key);
    totals.set(key, {
      phone: row._id.phone,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      productId,
      quantity: (current?.quantity || 0) + row.quantity,
    });
  }

  const results = [];
  for (const scheme of schemes) {
    const products = scheme.products.filter((product) => product?._id);
    if (products.length === 0) continue;
    const productIds = new Set(products.map((product) => product._id.toString()));
    const schemeTotals = new Map<string, typeof totals extends Map<string, infer V> ? V : never>();

    for (const total of totals.values()) {
      if (!productIds.has(total.productId)) continue;
      const phone = normalizePhone(total.phone);
      const current = schemeTotals.get(phone);
      schemeTotals.set(phone, {
        ...total,
        productId: "",
        quantity: (current?.quantity || 0) + total.quantity,
      });
    }

    if (customerPhone && !schemeTotals.has(normalizePhone(customerPhone))) {
      schemeTotals.set(normalizePhone(customerPhone), {
        phone: customerPhone,
        customerName: "",
        productId: "",
        quantity: 0,
      });
    }

    for (const total of schemeTotals.values()) {
      const eligible =
        total.quantity >= scheme.minQuantity &&
        total.quantity <= scheme.maxQuantity;
      results.push({
        id: `${scheme._id.toString()}:${normalizePhone(total.phone)}`,
        schemeId: scheme._id.toString(),
        customer: {
          name: total.customerName,
          phone: total.phone,
          email: total.customerEmail,
        },
        products: products.map((product) => ({
          id: product._id.toString(),
          title: product.title,
          photo: product.photo,
        })),
        purchasedQuantity: total.quantity,
        minQuantity: scheme.minQuantity,
        maxQuantity: scheme.maxQuantity,
        remainingQuantity: Math.max(0, scheme.minQuantity - total.quantity),
        eligible,
        giftType: scheme.giftType,
        giftName: scheme.giftName,
        cashAmount: scheme.cashAmount,
        expiresAt: scheme.expiresAt,
      });
    }
  }

  return results;
}
