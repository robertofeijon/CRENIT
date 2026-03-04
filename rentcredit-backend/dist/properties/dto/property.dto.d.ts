export declare class CreatePropertyDto {
    name: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    monthlyRent?: number;
    unitCount?: number;
}
export declare class UpdatePropertyDto {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    monthlyRent?: number;
    unitCount?: number;
}
