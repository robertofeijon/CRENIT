import { TenantsService } from './tenants.service';
export declare class TenantsController {
    private tenantsService;
    constructor(tenantsService: TenantsService);
    getTenantsByProperty(propertyId: string, req: any): Promise<{
        user: {
            id: string | undefined;
            email: string | undefined;
            fullName: string | undefined;
            phoneNumber: string | undefined;
        };
        creditProfile: import("../entities").TenantProfile | null;
        paymentHistory: {
            total: number;
            completed: number;
            pending: number;
            overdue: number;
        };
    }[]>;
    getLandlordTenants(req: any): Promise<{
        propertyId: string;
        propertyName: string;
        tenants: Array<{
            user: {
                id: string | undefined;
                email: string | undefined;
                fullName: string | undefined;
                phoneNumber: string | undefined;
            };
            creditProfile: unknown;
            paymentHistory: {
                total: number;
                completed: number;
                pending: number;
                overdue: number;
            };
        }>;
    }[]>;
    getTenantProfile(tenantId: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            phoneNumber: string;
            kycStatus: string;
        };
        creditProfile: import("../entities").TenantProfile | {
            creditScore: number;
            creditTier: string;
            paymentStreak: number;
            onTimePaymentPercentage: number;
        };
        paymentHistory: {
            total: number;
            completed: number;
            pending: number;
            overdue: number;
            onTimePayments: number;
        };
        recentPayments: import("../entities").Payment[];
    }>;
    getTenantReliabilityScore(tenantId: string): Promise<{
        score: number;
        breakdown: {
            creditTier: string;
            paymentStreak: number;
            onTimePercentage: number;
            totalPayments: number;
        };
    }>;
}
