"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
let DisputesService = class DisputesService {
    disputesRepository;
    paymentsRepository;
    usersRepository;
    constructor(disputesRepository, paymentsRepository, usersRepository) {
        this.disputesRepository = disputesRepository;
        this.paymentsRepository = paymentsRepository;
        this.usersRepository = usersRepository;
    }
    async getAllDisputes() {
        const disputes = await this.disputesRepository.find({
            order: { createdAt: 'DESC' },
            relations: ['tenant', 'landlord', 'payment', 'resolvedByAdmin'],
        });
        return disputes.map((d) => this.formatDispute(d));
    }
    async getLandlordDisputes(landlordId) {
        const disputes = await this.disputesRepository.find({
            where: { landlordId },
            order: { createdAt: 'DESC' },
            relations: ['tenant', 'landlord', 'payment'],
        });
        return disputes.map((d) => this.formatDispute(d));
    }
    async getTenantDisputes(tenantId) {
        const disputes = await this.disputesRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
            relations: ['tenant', 'landlord', 'payment'],
        });
        return disputes.map((d) => this.formatDispute(d));
    }
    async createDispute(userId, paymentId, type, reason, description, amount) {
        const payment = await this.paymentsRepository.findOne({
            where: { id: paymentId },
            relations: ['property'],
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        const property = payment.property;
        const dispute = this.disputesRepository.create({
            paymentId,
            tenantId: payment.tenantId,
            landlordId: property.landlordId,
            type,
            reason,
            description,
            amount: amount || payment.amount,
            status: 'open',
        });
        const saved = await this.disputesRepository.save(dispute);
        return {
            message: 'Dispute created successfully',
            dispute: this.formatDispute(saved),
        };
    }
    async resolveDispute(disputeId, adminId, status, resolution) {
        const dispute = await this.disputesRepository.findOne({
            where: { id: disputeId },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        dispute.status = status;
        dispute.resolution = resolution;
        dispute.resolvedByAdminId = adminId;
        dispute.resolutionDate = new Date();
        const saved = await this.disputesRepository.save(dispute);
        return {
            message: `Dispute ${status} successfully`,
            dispute: this.formatDispute(saved),
        };
    }
    formatDispute(dispute) {
        return {
            id: dispute.id,
            paymentId: dispute.paymentId,
            tenantId: dispute.tenantId,
            tenantName: dispute.tenant?.fullName || 'Unknown Tenant',
            landlordId: dispute.landlordId,
            landlordName: dispute.landlord?.fullName || 'Unknown Landlord',
            type: dispute.type,
            reason: dispute.reason,
            description: dispute.description,
            status: dispute.status,
            amount: dispute.amount,
            resolution: dispute.resolution,
            notes: dispute.resolution,
            resolvedByAdmin: dispute.resolvedByAdmin?.fullName,
            createdAt: dispute.createdAt,
            resolutionDate: dispute.resolutionDate,
        };
    }
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Dispute)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Payment)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map