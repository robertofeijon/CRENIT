-- Landlord proof-of-property and lease agreement attachments

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('PROPERTY_PROOF', 'LEASE_AGREEMENT', 'OWNERSHIP_DOCUMENT', 'OTHER')),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  description TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_landlord ON public.attachments(landlord_id);
CREATE INDEX idx_attachments_property ON public.attachments(property_id);
CREATE INDEX idx_attachments_status ON public.attachments(status);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can upload and view own attachments" ON public.attachments
  FOR ALL USING (auth.uid() = landlord_id);

CREATE POLICY "Admins can view all attachments" ON public.attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Service requests for "done for me" assistance
CREATE TABLE IF NOT EXISTS public.attachment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('UPLOAD_DOCUMENTS', 'VERIFY_DOCUMENTS', 'FULL_ONBOARDING')),
  description TEXT,
  fee_amount NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachment_requests_landlord ON public.attachment_requests(landlord_id);
CREATE INDEX idx_attachment_requests_status ON public.attachment_requests(status);
CREATE INDEX idx_attachment_requests_admin ON public.attachment_requests(assigned_admin_id);

ALTER TABLE public.attachment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view own requests" ON public.attachment_requests
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can create requests" ON public.attachment_requests
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Admins can manage all requests" ON public.attachment_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
