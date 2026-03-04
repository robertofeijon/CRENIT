import { Payment } from './payment.entity';
import { TenantProfile } from './tenant-profile.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    kycStatus: string;
    kycDocumentUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    payments: Payment[];
    tenantProfile: TenantProfile[];
}
