import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IEmployeeProduct {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  quantity: number;
  assignedAt: Date;
}

export interface IHoldings {
  cash: number;
  online: number;
  total: number;
}

export interface IEmployeeAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IEmployee extends Document {
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  dateOfJoining: Date;
  password: string;
  profilePhoto?: string;
  address?: IEmployeeAddress;
  status: "Online" | "Offline";
  products: IEmployeeProduct[];
  holdings: IHoldings;
  otp?: string;
  otpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeProductSchema = new Schema<IEmployeeProduct>(
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
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const EmployeeAddressSchema = new Schema<IEmployeeAddress>(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit pincode"],
    },
    country: { type: String, required: true, trim: true, default: "India" },
  },
  { _id: false }
);

const EmployeeSchema = new Schema<IEmployee>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [18, "Age must be at least 18"],
      max: [100, "Age must be less than 100"],
    },
    dateOfJoining: {
      type: Date,
      required: [true, "Date of joining is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    profilePhoto: {
      type: String,
      default: undefined,
    },
    address: {
      type: EmployeeAddressSchema,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["Online", "Offline"],
      default: "Offline",
    },
    products: {
      type: [EmployeeProductSchema],
      default: [],
    },
    holdings: {
      cash: {
        type: Number,
        default: 0,
        min: [0, "Cash holdings cannot be negative"],
      },
      online: {
        type: Number,
        default: 0,
        min: [0, "Online holdings cannot be negative"],
      },
      total: {
        type: Number,
        default: 0,
        min: [0, "Total holdings cannot be negative"],
      },
    },
    otp: {
      type: String,
      default: undefined,
    },
    otpExpiry: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Refresh a cached development model created before address support was added.
if (
  mongoose.models.Employee &&
  !mongoose.models.Employee.schema.path("address")
) {
  mongoose.deleteModel("Employee");
}

// Prevent model recompilation in development
const Employee: Model<IEmployee> =
  mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
