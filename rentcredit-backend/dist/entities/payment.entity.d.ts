import { User } from './user.entity';
import { Property } from './property.entity';
export declare class Payment {
    id: string;
    tenantId: string;
    propertyId: string;
    amount: number;
    status: string;
    dueDate: Date;
    paidAt: Date;
    receiptUrl: string;
    isOnTime: boolean;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    tenant: User;
    property: Property;
}
