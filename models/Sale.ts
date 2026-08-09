import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface ISaleItem {
  product: Types.ObjectId;
  productTitle: string;
  quantity: number;
  pricePerUnit: number;
  taxableAmount: number;
  gstMaster?: Types.ObjectId;
  gstName?: string;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
}

export interface ICustomer {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  billingAddress?: string;
}

export interface ISale extends Document {
  employee: Types.ObjectId;
  productRequest?: Types.ObjectId;
  items: ISaleItem[];
  customer: ICustomer;
  paymentMethod: "Cash" | "Online";
  subtotal: number;
  totalGst: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: [0, "Taxable amount cannot be negative"],
    },
    gstMaster: {
      type: Schema.Types.ObjectId,
      ref: "GstMaster",
      default: undefined,
    },
    gstName: {
      type: String,
      default: undefined,
    },
    gstRate: {
      type: Number,
      default: 0,
      min: [0, "GST rate cannot be negative"],
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: [0, "GST amount cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
    },
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    productRequest: {
      type: Schema.Types.ObjectId,
      ref: "ProductRequest",
      unique: true,
      sparse: true,
      default: undefined,
    },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: "At least one item is required",
      },
    },
    customer: {
      type: CustomerSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Online"],
      required: [true, "Payment method is required"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    totalGst: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "GST total cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Refresh a cached development model created before request-linked sales.
if (mongoose.models.Sale && !mongoose.models.Sale.schema.path("productRequest")) {
  mongoose.deleteModel("Sale");
}

// Prevent model recompilation in development
const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);

export default Sale;
