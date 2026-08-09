import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IRequestProduct {
  product: Types.ObjectId;
  quantity: number;
}

export interface ICustomerDetails {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface INote {
  by: "admin" | "customer";
  content: string;
  createdAt: Date;
}

export interface IProductRequest extends Document {
  customer: Types.ObjectId;
  products: IRequestProduct[];
  assignedEmployee?: Types.ObjectId;
  assignedAt?: Date;
  status: "pending" | "ongoing" | "delivered";
  customerDetails: ICustomerDetails;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const RequestProductSchema = new Schema<IRequestProduct>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
  },
  { _id: false }
);

const CustomerDetailsSchema = new Schema<ICustomerDetails>(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    by: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProductRequestSchema = new Schema<IProductRequest>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    products: {
      type: [RequestProductSchema],
      required: true,
      validate: {
        validator: function (v: IRequestProduct[]) {
          return v && v.length > 0;
        },
        message: "At least one product is required",
      },
    },
    assignedEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: undefined,
    },
    assignedAt: {
      type: Date,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["pending", "ongoing", "delivered"],
      default: "pending",
    },
    customerDetails: {
      type: CustomerDetailsSchema,
      required: true,
    },
    notes: {
      type: [NoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
ProductRequestSchema.index({ customer: 1 });
ProductRequestSchema.index({ assignedEmployee: 1, createdAt: -1 });
ProductRequestSchema.index({ status: 1 });
ProductRequestSchema.index({ createdAt: -1 });
ProductRequestSchema.index({ "customerDetails.name": "text" });

// Next.js keeps compiled Mongoose models during hot reload. If the cached model
// predates employee assignment, patch old references and recompile this model
// so document setters/change tracking are also generated for the new fields.
let existingProductRequest = mongoose.models.ProductRequest as
  | Model<IProductRequest>
  | undefined;

if (
  existingProductRequest &&
  !existingProductRequest.schema.path("assignedEmployee")
) {
  existingProductRequest.schema.add({
    assignedEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: undefined,
    },
    assignedAt: {
      type: Date,
      default: undefined,
    },
  });
  mongoose.deleteModel("ProductRequest");
  existingProductRequest = undefined;
}

const ProductRequest: Model<IProductRequest> =
  existingProductRequest ||
  mongoose.model<IProductRequest>("ProductRequest", ProductRequestSchema);

export default ProductRequest;
