import { User } from './user.entity';
export declare class TenantProfile {
    id: string;
    userId: string;
    creditScore: number;
    paymentStreak: number;
    totalPayments: number;
    onTimePayments: number;
    creditTier: string;
    onTimePaymentPercentage: number;
    createdAt: Date;
    updatedAt: Date;
    user: User;
}
