-- Create storage bucket for company assets (logos, branding)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) policies for company assets
CREATE POLICY "Users can upload company assets for their company" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view company assets for their company" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company assets for their company" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'company-logos'
    AND (storage.foldername(name))[2] = (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Allow public access to company assets for viewing invoices
CREATE POLICY "Public can view company assets" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company-logos'
  );