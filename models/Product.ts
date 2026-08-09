import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  photo?: string;
  title: string;
  description?: string;
  price: {
    base: number;
    lowestSellingPrice: number;
  };
  gst?: Types.ObjectId;
  status: "Active" | "Inactive";
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    photo: {
      type: String,
      default: undefined,
    },
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      base: {
        type: Number,
        required: [true, "Base price is required"],
        min: [0, "Price cannot be negative"],
      },
      lowestSellingPrice: {
        type: Number,
        required: [true, "Lowest selling price is required"],
        min: [0, "Price cannot be negative"],
      },
    },
    gst: {
      type: Schema.Types.ObjectId,
      ref: "GstMaster",
      default: undefined,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation in development
const Product: Model<IProduct> =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
