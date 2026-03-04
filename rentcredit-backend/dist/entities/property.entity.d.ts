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
    unitCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    landlord: User;
    landlordId: string;
    payments: Payment[];
}
