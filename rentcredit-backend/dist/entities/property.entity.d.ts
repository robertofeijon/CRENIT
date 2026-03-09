import { User } from './user.entity';
import { Payment } from './payment.entity';
export declare class Property {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    monthlyRent: number;
    images: string[];
    unitCount: number;
    description: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    landlord: User;
    landlordId: string;
    payments: Payment[];
}
