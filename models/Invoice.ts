import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IInvoiceItem {
  product?: Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  gstMaster?: Types.ObjectId;
  gstName?: string;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  dateOfIssue: Date;
  dueDate: Date;
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone?: string;
    email?: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountDue: number;
  notes?: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  createdAt: Date;
  updatedAt: Date;
}

// Counter schema for auto-incrementing invoice numbers
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: undefined,
    },
    description: {
      type: String,
      required: [true, "Item description is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    gstMaster: {
      type: Schema.Types.ObjectId,
      ref: "GstMaster",
      default: undefined,
    },
    gstName: { type: String, default: undefined },
    gstRate: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    dateOfIssue: {
      type: Date,
      required: [true, "Date of issue is required"],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    customer: {
      name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true,
      },
      address: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      pincode: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: undefined,
      },
      email: {
        type: String,
        default: undefined,
      },
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: {
        validator: function (items: IInvoiceItem[]) {
          return items.length > 0;
        },
        message: "At least one item is required",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, "Tax rate cannot be negative"],
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    total: {
      type: Number,
      required: true,
    },
    amountDue: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Overdue"],
      default: "Draft",
    },
  },
  {
    timestamps: true,
  }
);

// Generate invoice number before saving
InvoiceSchema.pre("save", async function () {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      { _id: `invoice_${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = counter.seq.toString().padStart(4, "0");
    this.invoiceNumber = `RA-${year}-${seq}`;
  }
});

// Prevent model recompilation in development
const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
