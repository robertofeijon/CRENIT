import { IsString } from 'class-validator';

export class LinkTenantDto {
  @IsString()
  tenantEmail: string;

  @IsString()
  propertyId: string;
}
