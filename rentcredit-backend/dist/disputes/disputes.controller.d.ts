import { Request as ExpressRequest } from 'express';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/dispute.dto';
export declare class DisputesController {
    private disputesService;
    constructor(disputesService: DisputesService);
    getAllDisputes(req: ExpressRequest & {
        user: {
            userId: string;
            role: string;
        };
    }): Promise<{
        id: string;
        paymentId: string;
        tenantId: string;
        tenantName: string;
        landlordId: string;
        landlordName: string;
        type: string;
        reason: string;
        description: string;
        status: string;
        amount: number;
        resolution: string;
        notes: string;
        resolvedByAdmin: string;
        createdAt: Date;
        resolutionDate: Date;
    }[]>;
    getLandlordDisputes(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<{
        id: string;
        paymentId: string;
        tenantId: string;
        tenantName: string;
        landlordId: string;
        landlordName: string;
        type: string;
        reason: string;
        description: string;
        status: string;
        amount: number;
        resolution: string;
        notes: string;
        resolvedByAdmin: string;
        createdAt: Date;
        resolutionDate: Date;
    }[]>;
    getTenantDisputes(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<{
        id: string;
        paymentId: string;
        tenantId: string;
        tenantName: string;
        landlordId: string;
        landlordName: string;
        type: string;
        reason: string;
        description: string;
        status: string;
        amount: number;
        resolution: string;
        notes: string;
        resolvedByAdmin: string;
        createdAt: Date;
        resolutionDate: Date;
    }[]>;
    createDispute(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, body: CreateDisputeDto): Promise<{
        message: string;
        dispute: {
            id: string;
            paymentId: string;
            tenantId: string;
            tenantName: string;
            landlordId: string;
            landlordName: string;
            type: string;
            reason: string;
            description: string;
            status: string;
            amount: number;
            resolution: string;
            notes: string;
            resolvedByAdmin: string;
            createdAt: Date;
            resolutionDate: Date;
        };
    }>;
    resolveDispute(disputeId: string, req: ExpressRequest & {
        user: {
            userId: string;
            role: string;
        };
    }, body: {
        resolution: string;
    }): Promise<{
        message: string;
        dispute: {
            id: string;
            paymentId: string;
            tenantId: string;
            tenantName: string;
            landlordId: string;
            landlordName: string;
            type: string;
            reason: string;
            description: string;
            status: string;
            amount: number;
            resolution: string;
            notes: string;
            resolvedByAdmin: string;
            createdAt: Date;
            resolutionDate: Date;
        };
    }>;
    rejectDispute(disputeId: string, req: ExpressRequest & {
        user: {
            userId: string;
            role: string;
        };
    }, body: {
        resolution: string;
    }): Promise<{
        message: string;
        dispute: {
            id: string;
            paymentId: string;
            tenantId: string;
            tenantName: string;
            landlordId: string;
            landlordName: string;
            type: string;
            reason: string;
            description: string;
            status: string;
            amount: number;
            resolution: string;
            notes: string;
            resolvedByAdmin: string;
            createdAt: Date;
            resolutionDate: Date;
        };
    }>;
}
