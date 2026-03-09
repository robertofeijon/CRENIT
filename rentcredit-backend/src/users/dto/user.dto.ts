import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class GetUserDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  kycStatus: string;
  createdAt: Date;
}
