import type { RequestWithUser } from '../types/express';
import { TenantsService } from './tenants.service';
import { InvoiceRequestDto } from './dto/invoice-request.dto';
export declare class TenantsController {
    private tenantsService;
    constructor(tenantsService: TenantsService);
    requestInvoice(req: RequestWithUser, dto: InvoiceRequestDto): Promise<{
        success: boolean;
        message: string;
        landlordId?: undefined;
        paymentId?: undefined;
    } | {
        success: boolean;
        message: string;
        landlordId: string;
        paymentId: string;
    }>;
    getTenantsByProperty(propertyId: string, req: RequestWithUser): Promise<{
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
    getLandlordTenants(req: RequestWithUser): Promise<{
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
    getMyProperty(req: RequestWithUser): Promise<import("../entities").Property>;
}
