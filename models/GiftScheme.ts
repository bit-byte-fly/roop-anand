import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type GiftType = "Cash" | "TV" | "Fridge" | "Other";

export interface IGiftScheme extends Document {
  products: Types.ObjectId[];
  giftType: GiftType;
  giftName: string;
  cashAmount?: number;
  minQuantity: number;
  maxQuantity: number;
  status: "Active" | "Inactive";
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GiftSchemeSchema = new Schema<IGiftScheme>(
  {
    products: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      required: [true, "At least one product is required"],
      validate: {
        validator: (products: Types.ObjectId[]) => products.length > 0,
        message: "At least one product is required",
      },
    },
    giftType: {
      type: String,
      enum: ["Cash", "TV", "Fridge", "Other"],
      required: true,
    },
    giftName: {
      type: String,
      required: [true, "Gift name is required"],
      trim: true,
    },
    cashAmount: {
      type: Number,
      min: [0.01, "Cash amount must be greater than zero"],
      default: undefined,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: [1, "Minimum quantity must be at least 1"],
    },
    maxQuantity: {
      type: Number,
      required: true,
      min: [1, "Maximum quantity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    expiresAt: {
      type: Date,
      default: undefined,
      index: true,
    },
  },
  { timestamps: true },
);

GiftSchemeSchema.index({ products: 1, minQuantity: 1, maxQuantity: 1 });

if (
  mongoose.models.GiftScheme &&
  (!mongoose.models.GiftScheme.schema.path("products") ||
    !mongoose.models.GiftScheme.schema.path("expiresAt") ||
    Boolean(
      (mongoose.models.GiftScheme.schema.path("expiresAt") as unknown as {
        isRequired?: boolean;
      })?.isRequired,
    ))
) {
  mongoose.deleteModel("GiftScheme");
}

const GiftScheme: Model<IGiftScheme> =
  mongoose.models.GiftScheme ||
  mongoose.model<IGiftScheme>("GiftScheme", GiftSchemeSchema);

export default GiftScheme;
