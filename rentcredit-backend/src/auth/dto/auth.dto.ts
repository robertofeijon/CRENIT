import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(['tenant', 'landlord'])
  role: string;

  @IsString()
  phoneNumber?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RoleSwitchDto {
  @IsEnum(['tenant', 'landlord'])
  role: string;
}
