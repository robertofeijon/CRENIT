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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
let PaymentsService = class PaymentsService {
    paymentsRepository;
    propertiesRepository;
    tenantProfileRepository;
    constructor(paymentsRepository, propertiesRepository, tenantProfileRepository) {
        this.paymentsRepository = paymentsRepository;
        this.propertiesRepository = propertiesRepository;
        this.tenantProfileRepository = tenantProfileRepository;
    }
    async createPayment(tenantId, createPaymentDto) {
        const property = await this.propertiesRepository.findOne({
            where: { id: createPaymentDto.propertyId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        const payment = this.paymentsRepository.create({
            tenantId,
            propertyId: createPaymentDto.propertyId,
            amount: createPaymentDto.amount,
            dueDate: new Date(createPaymentDto.dueDate),
            status: 'pending',
            notes: createPaymentDto.notes,
        });
        const savedPayment = await this.paymentsRepository.save(payment);
        return {
            message: 'Payment created successfully',
            payment: {
                id: savedPayment.id,
                amount: savedPayment.amount,
                dueDate: savedPayment.dueDate,
                status: savedPayment.status,
            },
        };
    }
    async recordPayment(paymentId, tenantId, recordPaymentDto) {
        const payment = await this.paymentsRepository.findOne({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Unauthorized to record this payment');
        }
        const now = new Date();
        const isOnTime = now <= payment.dueDate;
        payment.status = 'completed';
        payment.paidAt = now;
        payment.isOnTime = isOnTime;
        if (recordPaymentDto.receiptUrl) {
            payment.receiptUrl = recordPaymentDto.receiptUrl;
        }
        if (recordPaymentDto.notes) {
            payment.notes = recordPaymentDto.notes;
        }
        const savedPayment = await this.paymentsRepository.save(payment);
        await this.updateTenantProfile(tenantId, isOnTime);
        return {
            message: 'Payment recorded successfully',
            payment: {
                id: savedPayment.id,
                status: savedPayment.status,
                paidAt: savedPayment.paidAt,
                isOnTime: savedPayment.isOnTime,
            },
        };
    }
    async getRentDue(tenantId) {
        const payment = await this.paymentsRepository.findOne({
            where: { tenantId, status: 'pending' },
            order: { dueDate: 'ASC' },
        });
        if (!payment) {
            return { amount: '$0', due: null };
        }
        return {
            amount: `$${payment.amount}`,
            due: payment.dueDate.toISOString().split('T')[0],
        };
    }
    async getTenantPayments(tenantId, status) {
        let query = this.paymentsRepository
            .createQueryBuilder('payment')
            .where('payment.tenantId = :tenantId', { tenantId });
        if (status) {
            query = query.andWhere('payment.status = :status', { status });
        }
        const payments = await query.orderBy('payment.dueDate', 'DESC').getMany();
        return payments;
    }
    async getPropertyPayments(propertyId) {
        return await this.paymentsRepository.find({
            where: { propertyId },
            order: { dueDate: 'DESC' },
        });
    }
    async getPaymentDetails(paymentId) {
        const payment = await this.paymentsRepository.findOne({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async updatePaymentStatus(paymentId, updatePaymentStatusDto) {
        const payment = await this.paymentsRepository.findOne({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        payment.status = updatePaymentStatusDto.status;
        if (updatePaymentStatusDto.notes) {
            payment.notes = updatePaymentStatusDto.notes;
        }
        const savedPayment = await this.paymentsRepository.save(payment);
        return {
            message: 'Payment status updated',
            payment: {
                id: savedPayment.id,
                status: savedPayment.status,
            },
        };
    }
    async updateTenantProfile(tenantId, isOnTime) {
        let profile = await this.tenantProfileRepository.findOne({
            where: { userId: tenantId },
        });
        if (!profile) {
            profile = this.tenantProfileRepository.create({
                userId: tenantId,
                creditScore: 300,
                creditTier: 'poor',
            });
        }
        profile.totalPayments += 1;
        if (isOnTime) {
            profile.onTimePayments += 1;
            profile.paymentStreak += 1;
        }
        else {
            profile.paymentStreak = 0;
        }
        profile.onTimePaymentPercentage = Math.round((profile.onTimePayments / profile.totalPayments) * 100);
        const baseScore = 300;
        const streakBonus = Math.min(profile.paymentStreak * 10, 200);
        const onTimeBonus = Math.round(profile.onTimePaymentPercentage * 3);
        profile.creditScore = Math.min(baseScore + streakBonus + onTimeBonus, 850);
        if (profile.creditScore >= 750) {
            profile.creditTier = 'excellent';
        }
        else if (profile.creditScore >= 670) {
            profile.creditTier = 'good';
        }
        else if (profile.creditScore >= 580) {
            profile.creditTier = 'fair';
        }
        else {
            profile.creditTier = 'poor';
        }
        await this.tenantProfileRepository.save(profile);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Property)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.TenantProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map