import { Types } from "mongoose";
import GstMaster from "@/models/GstMaster";
import Product from "@/models/Product";

interface InvoiceItemInput {
  product?: string | { _id?: string };
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceProduct {
  _id: Types.ObjectId;
  title: string;
  gst?: {
    _id: Types.ObjectId;
    name: string;
    rate: number;
  } | null;
}

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;
const productIdOf = (product: InvoiceItemInput["product"]) =>
  typeof product === "string" ? product : product?._id;

export async function calculateInvoicePricing(items: InvoiceItemInput[]) {
  void GstMaster;
  const productIds = items
    .map((item) => productIdOf(item.product))
    .filter((id): id is string => Boolean(id));
  const products = (await Product.find({ _id: { $in: productIds } })
    .select("title gst")
    .populate("gst", "name rate")
    .lean()) as unknown as InvoiceProduct[];
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const pricedItems = items.map((item) => {
    const productId = productIdOf(item.product);
    const product = productId ? productMap.get(productId) : undefined;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const amount = roundMoney(quantity * unitPrice);
    const gstRate = Number(product?.gst?.rate || 0);
    const gstAmount = roundMoney((amount * gstRate) / 100);

    return {
      product: product?._id,
      description: item.description?.trim() || product?.title || "Item",
      quantity,
      unitPrice,
      amount,
      gstMaster: product?.gst?._id,
      gstName: product?.gst?.name,
      gstRate,
      gstAmount,
      lineTotal: roundMoney(amount + gstAmount),
    };
  });

  const subtotal = roundMoney(pricedItems.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = roundMoney(pricedItems.reduce((sum, item) => sum + item.gstAmount, 0));
  return { items: pricedItems, subtotal, taxAmount };
}
