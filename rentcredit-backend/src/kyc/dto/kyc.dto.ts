import { IsString, IsEnum } from 'class-validator';

export class UploadKYCDto {
  @IsString()
  documentType: string; // 'driver_license', 'passport', 'national_id'

  @IsString()
  documentUrl: string; // Base64 or URL
}

export class UpdateKYCStatusDto {
  @IsEnum(['verified', 'rejected'])
  status: string;

  @IsString()
  rejectionReason?: string;
}
