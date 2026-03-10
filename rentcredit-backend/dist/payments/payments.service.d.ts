import { Repository } from 'typeorm';
import { Payment, Property, TenantProfile } from '../entities';
import { CreatePaymentDto, UpdatePaymentStatusDto, RecordPaymentDto } from './dto/payment.dto';
export declare class PaymentsService {
    private paymentsRepository;
    private propertiesRepository;
    private tenantProfileRepository;
    constructor(paymentsRepository: Repository<Payment>, propertiesRepository: Repository<Property>, tenantProfileRepository: Repository<TenantProfile>);
    getPendingInvoicesForLandlord(landlordId: string): Promise<Payment[]>;
    approveInvoiceRequest(invoiceId: string, landlordId: string): Promise<{
        message: string;
        id: string;
    }>;
    rejectInvoiceRequest(invoiceId: string, landlordId: string): Promise<{
        message: string;
        id: string;
    }>;
    createPayment(tenantId: string, createPaymentDto: CreatePaymentDto): Promise<{
        message: string;
        payment: {
            id: string;
            amount: number;
            dueDate: Date;
            status: string;
        };
    }>;
    recordPayment(paymentId: string, tenantId: string, recordPaymentDto: RecordPaymentDto): Promise<{
        message: string;
        payment: {
            id: string;
            status: string;
            paidAt: Date;
            isOnTime: boolean;
        };
    }>;
    getRentDue(tenantId: string): Promise<{
        amount: string;
        due: null;
    } | {
        amount: string;
        due: string;
    }>;
    getTenantPayments(tenantId: string, status?: string): Promise<Payment[]>;
    getPropertyPayments(propertyId: string): Promise<Payment[]>;
    getAllLandlordPayments(landlordId: string): Promise<Payment[]>;
    getPaymentDetails(paymentId: string): Promise<Payment>;
    updatePaymentStatus(paymentId: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<{
        message: string;
        payment: {
            id: string;
            status: string;
        };
    }>;
    private updateTenantProfile;
}
