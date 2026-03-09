export declare class CreatePropertyDto {
    name: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    monthlyRent?: number;
    unitCount?: number;
    description?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
}
export declare class UpdatePropertyDto {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    monthlyRent?: number;
    unitCount?: number;
    description?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
}
