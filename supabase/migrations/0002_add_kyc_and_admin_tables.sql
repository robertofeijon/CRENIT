-- Add KYC and admin support columns to profiles
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kyc_reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  doc_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,
  status TEXT DEFAULT 'PENDING'
);

-- Tenant invitations table
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) NOT NULL,
  tenant_email TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  property_unit_id UUID,
  rent_amount DECIMAL(10,2) NOT NULL,
  due_date INTEGER NOT NULL,
  lease_start DATE NOT NULL,
  lease_end DATE,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'PENDING',
  invited_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Properties and units tables
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) NOT NULL,
  address TEXT NOT NULL,
  suburb TEXT,
  city TEXT,
  geo_coordinates JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  unit_number TEXT,
  bedrooms INTEGER,
  monthly_rent DECIMAL(10,2) NOT NULL,
  is_occupied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_unit_id UUID REFERENCES property_units(id) NOT NULL,
  tenant_id UUID REFERENCES profiles(id),
  landlord_id UUID REFERENCES profiles(id),
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent DECIMAL(10,2) NOT NULL,
  due_date INTEGER NOT NULL,
  deposit_amount DECIMAL(10,2),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);
