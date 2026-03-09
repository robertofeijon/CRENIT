import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  paymentId: string;

  @IsString()
  type: string;

  @IsString()
  reason: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  amount?: number;
}