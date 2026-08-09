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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUploadThing } from "@/lib/uploadthing";
import {
  Loader2,
  X,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  ImagePlus,
  MapPin,
} from "lucide-react";

interface Employee {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  dateOfJoining: string;
  profilePhoto?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  status: "Online" | "Offline";
}

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function EmployeeForm({
  employee,
  onSubmit,
  isSubmitting,
  onCancel,
}: EmployeeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    gender: "" as "" | "Male" | "Female" | "Other",
    age: "",
    dateOfJoining: "",
    password: "",
    confirmPassword: "",
    status: "Offline" as "Online" | "Offline",
  });

  // Separate state for photo management
  const [existingPhoto, setExistingPhoto] = useState<string>(""); // URL from server
  const [localPreview, setLocalPreview] = useState<string>(""); // Base64 preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // File to upload
  const [isRemoving, setIsRemoving] = useState(false); // Flag if user wants to remove photo

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // UploadThing hook
  const { startUpload } = useUploadThing("profilePhoto", {
    onUploadError: (error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
      alert(`Upload failed: ${error.message}`);
    },
  });

  /* Employee changes when the create/edit dialog is reused, so the local form
     must be synchronized with the newly selected record. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName || "",
        phoneNumber: employee.phoneNumber || "",
        email: employee.email || "",
        street: employee.address?.street || "",
        city: employee.address?.city || "",
        state: employee.address?.state || "",
        pincode: employee.address?.pincode || "",
        country: employee.address?.country || "India",
        gender: employee.gender || "",
        age: employee.age?.toString() || "",
        dateOfJoining: employee.dateOfJoining
          ? new Date(employee.dateOfJoining).toISOString().split("T")[0]
          : "",
        password: "",
        confirmPassword: "",
        status: employee.status || "Offline",
      });
      setExistingPhoto(employee.profilePhoto || "");
      setLocalPreview("");
      setSelectedFile(null);
      setIsRemoving(false);
    } else {
      // Reset form for new employee
      setFormData({
        fullName: "",
        phoneNumber: "",
        email: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        gender: "",
        age: "",
        dateOfJoining: "",
        password: "",
        confirmPassword: "",
        status: "Offline",
      });
      setExistingPhoto("");
      setLocalPreview("");
      setSelectedFile(null);
      setIsRemoving(false);
    }
  }, [employee]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "password" || field === "confirmPassword") {
      setPasswordError("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be less than 4MB");
      return;
    }

    setSelectedFile(file);
    setIsRemoving(false);

    // Create base64 preview
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

    // Validate passwords match
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }
    }

    // For new employee, password is required
    if (!employee && !formData.password) {
      setPasswordError("Password is required");
      return;
    }

    let profilePhotoUrl: string | undefined = undefined;

    // Handle image upload/removal logic
    if (selectedFile) {
      // New file selected - upload it using UploadThing
      setIsUploading(true);
      try {
        const uploadResult = await startUpload([selectedFile]);
        setIsUploading(false);

        if (!uploadResult || uploadResult.length === 0) {
          alert("Failed to upload image. Please try again.");
          return;
        }

        // Get URL from upload result
        profilePhotoUrl = uploadResult[0].ufsUrl || uploadResult[0].url;
      } catch (error) {
        setIsUploading(false);
        console.error("Upload error:", error);
        alert("Failed to upload image. Please try again.");
        return;
      }
    } else if (isRemoving) {
      // User wants to remove photo - send empty string
      profilePhotoUrl = "";
    } else if (existingPhoto) {
      // Keep existing photo
      profilePhotoUrl = existingPhoto;
    }

    onSubmit({
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      email: formData.email || undefined,
      address: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim() || "India",
      },
      gender: formData.gender,
      age: parseInt(formData.age, 10),
      dateOfJoining: formData.dateOfJoining,
      profilePhoto: profilePhotoUrl,
      password: formData.password || undefined,
      status: formData.status,
    });
  };

  // Get the current display preview
  const displayPreview = localPreview || (isRemoving ? "" : existingPhoto);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
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
      {/* Profile Photo */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label>Profile Photo (Optional)</Label>
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
                <Avatar className="h-24 w-24 ring-2 ring-indigo-100 ring-offset-2">
                  <AvatarImage src={displayPreview} alt="Profile" />
                  <AvatarFallback className="text-xl bg-indigo-100 text-indigo-600">
                    {formData.fullName?.charAt(0)?.toUpperCase() || "E"}
                  </AvatarFallback>
                </Avatar>
                <motion.button
                  type="button"
                  onClick={removePhoto}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                </motion.button>
                {/* Change photo overlay */}
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                  className="h-24 w-24 border-2 border-dashed border-slate-300 rounded-full flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <ImagePlus className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500">Add Photo</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File info */}
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

      {/* Full Name */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="fullName">Full Name *</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="Enter full name"
          required
          className="transition-all focus:ring-2 focus:ring-indigo-200"
        />
      </motion.div>

      {/* Phone Number */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number *</Label>
        <Input
          id="phoneNumber"
          value={formData.phoneNumber}
          onChange={(e) => handleChange("phoneNumber", e.target.value)}
          placeholder="Enter phone number"
          required
          className="transition-all focus:ring-2 focus:ring-indigo-200"
        />
      </motion.div>

      {/* Email */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="email">Email Address * (Used for login)</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="Enter email address"
          required
          className="transition-all focus:ring-2 focus:ring-indigo-200"
        />
      </motion.div>

      {/* Employee Address */}
      <motion.div
        variants={itemVariants}
        className="space-y-4 p-4 rounded-lg bg-indigo-50/40 border border-indigo-100"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <MapPin className="h-4 w-4 text-indigo-600" />
          <Label className="text-base font-medium">Employee Address</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">Address *</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder="House/building, street, area"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter city"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="Enter state"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode *</Label>
            <Input
              id="pincode"
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              value={formData.pincode}
              onChange={(e) =>
                handleChange("pincode", e.target.value.replace(/\D/g, ""))
              }
              placeholder="6-digit pincode"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Enter country"
              required
            />
          </div>
        </div>
      </motion.div>

      {/* Gender & Age Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select
            key={formData.gender || "empty"}
            value={formData.gender}
            onValueChange={(value) => handleChange("gender", value)}
          >
            <SelectTrigger className="transition-all focus:ring-2 focus:ring-indigo-200">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age *</Label>
          <Input
            id="age"
            type="number"
            min="18"
            max="100"
            value={formData.age}
            onChange={(e) => handleChange("age", e.target.value)}
            placeholder="Enter age"
            required
            className="transition-all focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </motion.div>

      {/* Date of Joining */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="dateOfJoining">Date of Joining *</Label>
        <Input
          id="dateOfJoining"
          type="date"
          value={formData.dateOfJoining}
          onChange={(e) => handleChange("dateOfJoining", e.target.value)}
          required
          className="transition-all focus:ring-2 focus:ring-indigo-200"
        />
      </motion.div>

      {/* Status */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label>Status</Label>
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChange("status", "Online")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 transition-all ${
              formData.status === "Online"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                formData.status === "Online" ? "bg-green-500" : "bg-slate-300"
              }`}
            />
            Online
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChange("status", "Offline")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 transition-all ${
              formData.status === "Offline"
                ? "border-slate-500 bg-slate-50 text-slate-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                formData.status === "Offline" ? "bg-slate-500" : "bg-slate-300"
              }`}
            />
            Offline
          </motion.button>
        </div>
      </motion.div>

      {/* Password Section */}
      <motion.div
        variants={itemVariants}
        className="space-y-4 p-4 rounded-lg bg-slate-50/50 border border-slate-200"
      >
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">
            {employee ? "Change Password" : "Set Password *"}
          </Label>
          {employee && (
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
              Optional
            </span>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-slate-600">
            {employee ? "New Password" : "Password"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={employee ? "Enter new password" : "Enter password"}
              minLength={6}
              className="pr-10 transition-all focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm text-slate-600">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder="Confirm password"
              minLength={6}
              className="pr-10 transition-all focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Password Match Indicator */}
        <AnimatePresence>
          {passwordError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-red-500"
            >
              {passwordError}
            </motion.p>
          )}
          {formData.password &&
            formData.confirmPassword &&
            formData.password === formData.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-green-600 flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Passwords match
              </motion.p>
            )}
        </AnimatePresence>
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
            ) : employee ? (
              "Update Employee"
            ) : (
              "Create Employee"
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
