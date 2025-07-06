"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { useUpdateBillingSettings } from "@/lib/hooks/useBilling";
import { supabase } from "@/lib/supabase/client";
import type { CompanyBillingSettings } from "@/lib/db/schema";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  Palette,
  FileText,
  Building2,
} from "lucide-react";

interface CompanyBrandingProps {
  companyId: string;
  companySettings: CompanyBillingSettings | null | undefined;
}

export function CompanyBranding({
  companyId,
  companySettings,
}: CompanyBrandingProps) {
  const [formData, setFormData] = useState({
    company_logo_url: companySettings?.company_logo_url || "",
    company_address: companySettings?.company_address || "",
    company_phone: companySettings?.company_phone || "",
    company_email: companySettings?.company_email || "",
    company_website: companySettings?.company_website || "",
    invoice_footer: companySettings?.invoice_footer || "",
    brand_primary_color: companySettings?.brand_primary_color || "#3b82f6",
    brand_secondary_color: companySettings?.brand_secondary_color || "#64748b",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    companySettings?.company_logo_url || null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateSettingsMutation = useUpdateBillingSettings(companyId);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
      );
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const filename = `company-logos/${companyId}/${timestamp}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("company-assets")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Update form data and preview
      setFormData((prev) => ({ ...prev, company_logo_url: publicUrl }));
      setPreviewUrl(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, company_logo_url: "" }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Failed to save branding settings:", error);
    }
  };

  const isFormChanged = () => {
    return Object.keys(formData).some(
      (key) =>
        formData[key as keyof typeof formData] !==
        (companySettings?.[key as keyof CompanyBillingSettings] || ""),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Branding
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize your company branding for invoices and communications
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending || !isFormChanged()}
          className="flex items-center gap-2"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Success/Error Messages */}
      {updateSettingsMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-2 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700">
              Branding settings saved successfully!
            </span>
          </CardContent>
        </Card>
      )}

      {(updateSettingsMutation.isError || uploadError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">
              {uploadError || "Failed to save branding settings"}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Upload your company logo for invoices and documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Preview */}
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Company Logo"
                  className="w-full max-w-xs h-32 object-contain border rounded-lg bg-gray-50"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveLogo}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-xs h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No logo uploaded</p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {previewUrl ? "Change Logo" : "Upload Logo"}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Max 5MB. Supports JPEG, PNG, GIF, WebP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>
              Choose colors that represent your brand in invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="primary-color"
                  type="color"
                  value={formData.brand_primary_color}
                  onChange={(e) =>
                    handleInputChange("brand_primary_color", e.target.value)
                  }
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={formData.brand_primary_color}
                  onChange={(e) =>
                    handleInputChange("brand_primary_color", e.target.value)
                  }
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="secondary-color"
                  type="color"
                  value={formData.brand_secondary_color}
                  onChange={(e) =>
                    handleInputChange("brand_secondary_color", e.target.value)
                  }
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={formData.brand_secondary_color}
                  onChange={(e) =>
                    handleInputChange("brand_secondary_color", e.target.value)
                  }
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex gap-2">
                <div
                  className="w-12 h-8 rounded border"
                  style={{ backgroundColor: formData.brand_primary_color }}
                  title="Primary Color"
                />
                <div
                  className="w-12 h-8 rounded border"
                  style={{ backgroundColor: formData.brand_secondary_color }}
                  title="Secondary Color"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Company details that will appear on invoices and official documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="company-email"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Billing Email
              </Label>
              <Input
                id="company-email"
                type="email"
                value={formData.company_email}
                onChange={(e) =>
                  handleInputChange("company_email", e.target.value)
                }
                placeholder="billing@company.com"
              />
            </div>

            <div>
              <Label
                htmlFor="company-phone"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="company-phone"
                type="tel"
                value={formData.company_phone}
                onChange={(e) =>
                  handleInputChange("company_phone", e.target.value)
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label
                htmlFor="company-website"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="company-website"
                type="url"
                value={formData.company_website}
                onChange={(e) =>
                  handleInputChange("company_website", e.target.value)
                }
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="company-address"
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Company Address
            </Label>
            <Textarea
              id="company-address"
              value={formData.company_address}
              onChange={(e) =>
                handleInputChange("company_address", e.target.value)
              }
              placeholder="123 Business St, Suite 100&#10;City, State 12345&#10;Country"
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Customization
          </CardTitle>
          <CardDescription>
            Customize the appearance and content of your invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invoice-footer">Custom Footer</Label>
            <Textarea
              id="invoice-footer"
              value={formData.invoice_footer}
              onChange={(e) =>
                handleInputChange("invoice_footer", e.target.value)
              }
              placeholder="Thank you for your business! Payment terms: Net 30 days."
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              This text will appear at the bottom of all invoices
            </p>
          </div>

          {/* Configuration Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-2">
              {formData.company_logo_url ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">Logo</span>
              <Badge
                variant={formData.company_logo_url ? "default" : "secondary"}
              >
                {formData.company_logo_url ? "Set" : "Not Set"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {formData.company_address ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">Address</span>
              <Badge
                variant={formData.company_address ? "default" : "secondary"}
              >
                {formData.company_address ? "Set" : "Not Set"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {formData.company_email ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">Email</span>
              <Badge variant={formData.company_email ? "default" : "secondary"}>
                {formData.company_email ? "Set" : "Not Set"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
