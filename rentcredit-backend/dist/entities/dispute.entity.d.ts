import { User } from './user.entity';
import { Payment } from './payment.entity';
export declare class Dispute {
    id: string;
    paymentId: string;
    payment: Payment;
    tenantId: string;
    tenant: User;
    landlordId: string;
    landlord: User;
    type: string;
    reason: string;
    description: string;
    status: string;
    amount: number;
    resolution: string;
    resolvedByAdminId: string;
    resolvedByAdmin: User;
    createdAt: Date;
    updatedAt: Date;
    resolutionDate: Date;
}
