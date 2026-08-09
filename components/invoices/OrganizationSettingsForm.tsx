"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Loader2,
  Upload,
  X,
  CreditCard,
  ImageOff,
} from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";

interface OrganizationSettings {
  companyName: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
}

interface OrganizationSettingsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function OrganizationSettingsForm({
  isOpen,
  onClose,
  onSave,
}: OrganizationSettingsFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [settings, setSettings] = useState<OrganizationSettings>({
    companyName: "",
    logo: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    phone: "",
    email: "",
    gstin: "",
    pan: "",
    bankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
    },
  });

  const [localPreview, setLocalPreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { startUpload } = useUploadThing("profilePhoto", {
    onUploadError: (error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
      alert(`Upload failed: ${error.message}`);
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          companyName: data.companyName || "",
          logo: data.logo || "",
          address: {
            street: data.address?.street || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            pincode: data.address?.pincode || "",
            country: data.address?.country || "India",
          },
          phone: data.phone || "",
          email: data.email || "",
          gstin: data.gstin || "",
          pan: data.pan || "",
          bankDetails: {
            accountName: data.bankDetails?.accountName || "",
            accountNumber: data.bankDetails?.accountNumber || "",
            bankName: data.bankDetails?.bankName || "",
            ifscCode: data.bankDetails?.ifscCode || "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLocalPreview("");
    setSettings((prev) => ({ ...prev, logo: "" }));
  };

  const handleUseAppLogo = () => {
    setSelectedFile(null);
    setLocalPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSettings((prev) => ({ ...prev, logo: "/roop-anand-logo.png" }));
  };

  const handleChange = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setSettings((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof OrganizationSettings] as Record<
            string,
            string
          >),
          [child]: value,
        },
      }));
    } else {
      setSettings((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings.companyName.trim()) {
      alert("Company name is required");
      return;
    }

    setSaving(true);

    try {
      let logoUrl = settings.logo;

      // Upload new logo if selected
      if (selectedFile) {
        setIsUploading(true);
        const uploadResult = await startUpload([selectedFile]);
        setIsUploading(false);

        if (!uploadResult || uploadResult.length === 0) {
          alert("Failed to upload logo. Please try again.");
          setSaving(false);
          return;
        }

        logoUrl = uploadResult[0].ufsUrl || uploadResult[0].url;
      }

      const res = await fetch("/api/organization-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          logo: logoUrl,
        }),
      });

      if (res.ok) {
        onSave();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = localPreview || settings.logo;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Organization Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                  {displayLogo ? (
                    <>
                      <img
                        src={displayLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <ImageOff className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUseAppLogo}
                    >
                      Use App Logo
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended: 200x200px, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4" />
                Address
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={settings.address.street}
                    onChange={(e) =>
                      handleChange("address.street", e.target.value)
                    }
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.address.city}
                    onChange={(e) =>
                      handleChange("address.city", e.target.value)
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={settings.address.state}
                    onChange={(e) =>
                      handleChange("address.state", e.target.value)
                    }
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={settings.address.pincode}
                    onChange={(e) =>
                      handleChange("address.pincode", e.target.value)
                    }
                    placeholder="Pincode"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={settings.address.country}
                    onChange={(e) =>
                      handleChange("address.country", e.target.value)
                    }
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4" />
                Contact
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="company@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Tax Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4" />
                Tax Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={settings.gstin || ""}
                    onChange={(e) => handleChange("gstin", e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={settings.pan || ""}
                    onChange={(e) => handleChange("pan", e.target.value)}
                    placeholder="AAAAA0000A"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4" />
                Bank Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={settings.bankDetails?.accountName || ""}
                    onChange={(e) =>
                      handleChange("bankDetails.accountName", e.target.value)
                    }
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={settings.bankDetails?.accountNumber || ""}
                    onChange={(e) =>
                      handleChange("bankDetails.accountNumber", e.target.value)
                    }
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={settings.bankDetails?.bankName || ""}
                    onChange={(e) =>
                      handleChange("bankDetails.bankName", e.target.value)
                    }
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={settings.bankDetails?.ifscCode || ""}
                    onChange={(e) =>
                      handleChange("bankDetails.ifscCode", e.target.value)
                    }
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || isUploading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
