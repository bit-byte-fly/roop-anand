import { Types } from "mongoose";
import GstMaster from "@/models/GstMaster";
import Product from "@/models/Product";

export interface SalePricingInput {
  productId: string;
  productTitle?: string;
  quantity: number;
  pricePerUnit: number;
}

interface PopulatedGst {
  _id: Types.ObjectId;
  name: string;
  rate: number;
}

interface ProductWithGst {
  _id: Types.ObjectId;
  title: string;
  gst?: PopulatedGst | null;
}

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

export async function calculateSalePricing(items: SalePricingInput[]) {
  void GstMaster;

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = (await Product.find({ _id: { $in: productIds } })
    .select("title gst")
    .populate("gst", "name rate")
    .lean()) as unknown as ProductWithGst[];
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const missingProducts = items
    .filter((item) => !productMap.has(item.productId))
    .map((item) => item.productTitle || item.productId);

  const saleItems = items
    .filter((item) => productMap.has(item.productId))
    .map((item) => {
      const product = productMap.get(item.productId)!;
      const taxableAmount = roundMoney(item.quantity * item.pricePerUnit);
      const gstRate = Number(product.gst?.rate || 0);
      const gstAmount = roundMoney((taxableAmount * gstRate) / 100);

      return {
        product: new Types.ObjectId(item.productId),
        productTitle: product.title,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        taxableAmount,
        gstMaster: product.gst?._id,
        gstName: product.gst?.name,
        gstRate,
        gstAmount,
        totalPrice: roundMoney(taxableAmount + gstAmount),
      };
    });

  const subtotal = roundMoney(
    saleItems.reduce((sum, item) => sum + item.taxableAmount, 0)
  );
  const totalGst = roundMoney(
    saleItems.reduce((sum, item) => sum + item.gstAmount, 0)
  );

  return {
    saleItems,
    missingProducts,
    subtotal,
    totalGst,
    totalAmount: roundMoney(subtotal + totalGst),
  };
}
