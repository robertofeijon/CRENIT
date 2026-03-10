import { Repository } from 'typeorm';
import { User, TenantProfile, Property, Payment } from '../entities';
export declare class TenantsService {
    private usersRepository;
    private tenantProfileRepository;
    private propertiesRepository;
    private paymentsRepository;
    constructor(usersRepository: Repository<User>, tenantProfileRepository: Repository<TenantProfile>, propertiesRepository: Repository<Property>, paymentsRepository: Repository<Payment>);
    requestInvoice(tenantId: string, propertyId: string, amount: number, notes?: string): Promise<{
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
    getTenantsByProperty(propertyId: string, landlordId: string): Promise<{
        user: {
            id: string | undefined;
            email: string | undefined;
            fullName: string | undefined;
            phoneNumber: string | undefined;
        };
        creditProfile: TenantProfile | null;
        paymentHistory: {
            total: number;
            completed: number;
            pending: number;
            overdue: number;
        };
    }[]>;
    getTenantProfile(tenantId: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            phoneNumber: string;
            kycStatus: string;
        };
        creditProfile: TenantProfile | {
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
        recentPayments: Payment[];
    }>;
    getLandlordTenants(landlordId: string): Promise<{
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
    getTenantReliabilityScore(tenantId: string): Promise<{
        score: number;
        breakdown: {
            creditTier: string;
            paymentStreak: number;
            onTimePercentage: number;
            totalPayments: number;
        };
    }>;
    getTenantProperty(tenantId: string): Promise<Property>;
}
