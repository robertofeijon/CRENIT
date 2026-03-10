import { IsString, IsNumber } from 'class-validator';

export class InvoiceRequestDto {
  @IsString()
  propertyId: string;

  @IsNumber()
  amount: number;

  @IsString()
  notes?: string;
}