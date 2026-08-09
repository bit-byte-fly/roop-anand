import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGstMaster extends Document {
  name: string;
  rate: number;
  description?: string;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const GstMasterSchema = new Schema<IGstMaster>(
  {
    name: {
      type: String,
      required: [true, "GST name is required"],
      trim: true,
      unique: true,
    },
    rate: {
      type: Number,
      required: [true, "GST rate is required"],
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100"],
    },
    description: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const GstMaster: Model<IGstMaster> =
  mongoose.models.GstMaster ||
  mongoose.model<IGstMaster>("GstMaster", GstMasterSchema);

export default GstMaster;
