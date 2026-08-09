"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadThing } from "@/lib/uploadthing";
import {
  Loader2,
  X,
  Upload,
  CheckCircle,
  ImagePlus,
  Package,
} from "lucide-react";

interface Product {
  _id: string;
  photo?: string;
  title: string;
  description?: string;
  price: {
    base: number;
    lowestSellingPrice: number;
  };
  status: "Active" | "Inactive";
  stockQuantity: number;
  gst?: GstMaster | null;
}

interface GstMaster {
  _id: string;
  name: string;
  rate: number;
  status: "Active" | "Inactive";
}

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSubmit,
  isSubmitting,
  onCancel,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(() => ({
    title: product?.title || "",
    description: product?.description || "",
    basePrice: product?.price?.base?.toString() || "",
    lowestSellingPrice:
      product?.price?.lowestSellingPrice?.toString() || "",
    status: product?.status || ("Active" as "Active" | "Inactive"),
    stockQuantity: product?.stockQuantity?.toString() || "0",
    gstId: product?.gst?._id || "",
  }));
  const [gstMasters, setGstMasters] = useState<GstMaster[]>([]);

  // Photo management
  const [existingPhoto] = useState<string>(product?.photo || "");
  const [localPreview, setLocalPreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [priceError, setPriceError] = useState("");

  // UploadThing hook
  const { startUpload } = useUploadThing("profilePhoto", {
    onUploadError: (error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
      alert(`Upload failed: ${error.message}`);
    },
  });

  useEffect(() => {
    const fetchGstMasters = async () => {
      try {
        const response = await fetch("/api/gst-masters");
        if (response.ok) setGstMasters(await response.json());
      } catch (error) {
        console.error("Error fetching GST masters:", error);
      }
    };
    fetchGstMasters();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "basePrice" || field === "lowestSellingPrice") {
      setPriceError("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be less than 4MB");
      return;
    }

    setSelectedFile(file);
    setIsRemoving(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setLocalPreview("");
    setSelectedFile(null);
    setIsRemoving(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate prices
    const base = parseFloat(formData.basePrice);
    const lowest = parseFloat(formData.lowestSellingPrice);

    if (isNaN(base) || base < 0) {
      setPriceError("Please enter a valid base price");
      return;
    }

    if (isNaN(lowest) || lowest < 0) {
      setPriceError("Please enter a valid lowest selling price");
      return;
    }

    if (lowest > base) {
      setPriceError("Lowest selling price cannot be greater than base price");
      return;
    }

    let photoUrl: string | undefined = undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadResult = await startUpload([selectedFile]);
        setIsUploading(false);

        if (!uploadResult || uploadResult.length === 0) {
          alert("Failed to upload image. Please try again.");
          return;
        }

        photoUrl = uploadResult[0].ufsUrl || uploadResult[0].url;
      } catch (error) {
        setIsUploading(false);
        console.error("Upload error:", error);
        alert("Failed to upload image. Please try again.");
        return;
      }
    } else if (isRemoving) {
      photoUrl = "";
    } else if (existingPhoto) {
      photoUrl = existingPhoto;
    }

    onSubmit({
      photo: photoUrl,
      title: formData.title,
      description: formData.description || undefined,
      price: {
        base: parseFloat(formData.basePrice),
        lowestSellingPrice: parseFloat(formData.lowestSellingPrice),
      },
      status: formData.status,
      stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
      gst: formData.gstId || null,
    });
  };

  const displayPreview = localPreview || (isRemoving ? "" : existingPhoto);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Product Photo */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label>Product Photo (Optional)</Label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {displayPreview ? (
              <motion.div
                key="photo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="h-24 w-24 rounded-lg overflow-hidden ring-2 ring-indigo-100 ring-offset-2">
                  <img
                    src={displayPreview}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={removePhoto}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-white" />
                </motion.button>
                {selectedFile && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    New
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-24 w-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <ImagePlus className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500">Add Photo</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1">
            {selectedFile ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm"
              >
                <p className="font-medium text-slate-700">
                  {selectedFile.name}
                </p>
                <p className="text-slate-500 text-xs">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ready to upload on save
                </p>
              </motion.div>
            ) : displayPreview ? (
              <p className="text-sm text-slate-500">Click photo to change</p>
            ) : (
              <div className="text-sm text-slate-500">
                <p>Click to select an image</p>
                <p className="text-xs text-slate-400">PNG, JPG up to 4MB</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="title">Product Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter product title"
          required
          className="transition-all focus:ring-2 focus:ring-indigo-200"
        />
      </motion.div>

      {/* Description */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter product description"
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
        />
      </motion.div>

      {/* Prices */}
      <motion.div
        variants={itemVariants}
        className="space-y-4 p-4 rounded-lg bg-slate-50/50 border border-slate-200"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <Label className="text-base font-medium">Pricing</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="basePrice" className="text-sm text-slate-600">
              Base Price before GST (₹) *
            </Label>
            <Input
              id="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.basePrice}
              onChange={(e) => handleChange("basePrice", e.target.value)}
              placeholder="0.00"
              required
              className="transition-all focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="lowestSellingPrice"
              className="text-sm text-slate-600"
            >
              Lowest Selling Price (₹) *
            </Label>
            <Input
              id="lowestSellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.lowestSellingPrice}
              onChange={(e) =>
                handleChange("lowestSellingPrice", e.target.value)
              }
              placeholder="0.00"
              required
              className="transition-all focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <AnimatePresence>
          {priceError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-red-500"
            >
              {priceError}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <Label htmlFor="gstMaster" className="text-sm text-slate-600">
            GST
          </Label>
          <Select
            value={formData.gstId || "none"}
            onValueChange={(value) =>
              handleChange("gstId", value === "none" ? "" : value)
            }
          >
            <SelectTrigger id="gstMaster">
              <SelectValue placeholder="Select GST rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No GST (0%)</SelectItem>
              {gstMasters
                .filter(
                  (gst) =>
                    gst.status === "Active" || gst._id === product?.gst?._id
                )
                .map((gst) => (
                <SelectItem key={gst._id} value={gst._id}>
                  {gst.name} ({gst.rate}%)
                  {gst.status === "Inactive" ? " — Inactive" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400">
            Manage rates from the GST Master page.
          </p>
        </div>
      </motion.div>

      {/* Status & Stock */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChange("status", "Active")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm ${
                formData.status === "Active"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  formData.status === "Active" ? "bg-green-500" : "bg-slate-300"
                }`}
              />
              Active
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChange("status", "Inactive")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm ${
                formData.status === "Inactive"
                  ? "border-slate-500 bg-slate-50 text-slate-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  formData.status === "Inactive"
                    ? "bg-slate-500"
                    : "bg-slate-300"
                }`}
              />
              Inactive
            </motion.button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stockQuantity">Stock Quantity *</Label>
          <Input
            id="stockQuantity"
            type="number"
            min="0"
            value={formData.stockQuantity}
            onChange={(e) => handleChange("stockQuantity", e.target.value)}
            placeholder="0"
            required
            className="transition-all focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="flex justify-end gap-3 pt-4 border-t"
      >
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isUploading}
          className="transition-all hover:bg-slate-100"
        >
          Cancel
        </Button>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : product ? (
              "Update Product"
            ) : (
              "Create Product"
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
