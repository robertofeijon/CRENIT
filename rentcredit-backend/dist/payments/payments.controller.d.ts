import { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentStatusDto, RecordPaymentDto } from './dto/payment.dto';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    getRentDue(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<{
        amount: string;
        due: null;
    } | {
        amount: string;
        due: string;
    }>;
    createPayment(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, createPaymentDto: CreatePaymentDto): Promise<{
        message: string;
        payment: {
            id: string;
            amount: number;
            dueDate: Date;
            status: string;
        };
    }>;
    recordPayment(paymentId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, recordPaymentDto: RecordPaymentDto): Promise<{
        message: string;
        payment: {
            id: string;
            status: string;
            paidAt: Date;
            isOnTime: boolean;
        };
    }>;
    getTenantPayments(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, status?: string): Promise<import("../entities").Payment[]>;
    getPropertyPayments(propertyId: string): Promise<import("../entities").Payment[]>;
    getPaymentDetails(paymentId: string): Promise<import("../entities").Payment>;
    updatePaymentStatus(paymentId: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<{
        message: string;
        payment: {
            id: string;
            status: string;
        };
    }>;
}
