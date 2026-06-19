-- SMS 2FA (alternative to TOTP) + OTP challenge storage

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS two_factor_method TEXT CHECK (two_factor_method IS NULL OR two_factor_method IN ('TOTP', 'SMS')),
  ADD COLUMN IF NOT EXISTS sms_otp_hash TEXT,
  ADD COLUMN IF NOT EXISTS sms_otp_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.two_factor_method IS 'TOTP (authenticator) or SMS when two_factor_enabled is true';
