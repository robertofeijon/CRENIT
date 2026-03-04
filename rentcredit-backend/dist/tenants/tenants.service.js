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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
let TenantsService = class TenantsService {
    usersRepository;
    tenantProfileRepository;
    propertiesRepository;
    paymentsRepository;
    constructor(usersRepository, tenantProfileRepository, propertiesRepository, paymentsRepository) {
        this.usersRepository = usersRepository;
        this.tenantProfileRepository = tenantProfileRepository;
        this.propertiesRepository = propertiesRepository;
        this.paymentsRepository = paymentsRepository;
    }
    async getTenantsByProperty(propertyId, landlordId) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        const payments = await this.paymentsRepository.find({
            where: { propertyId },
        });
        const tenantIds = [...new Set(payments.map((p) => p.tenantId))];
        const tenants = await Promise.all(tenantIds.map(async (tenantId) => {
            const user = await this.usersRepository.findOne({
                where: { id: tenantId },
            });
            const profile = await this.tenantProfileRepository.findOne({
                where: { userId: tenantId },
            });
            const tenantPayments = payments.filter((p) => p.tenantId === tenantId);
            return {
                user: {
                    id: user?.id,
                    email: user?.email,
                    fullName: user?.fullName,
                    phoneNumber: user?.phoneNumber,
                },
                creditProfile: profile || null,
                paymentHistory: {
                    total: tenantPayments.length,
                    completed: tenantPayments.filter((p) => p.status === 'completed')
                        .length,
                    pending: tenantPayments.filter((p) => p.status === 'pending')
                        .length,
                    overdue: tenantPayments.filter((p) => p.status === 'overdue')
                        .length,
                },
            };
        }));
        return tenants;
    }
    async getTenantProfile(tenantId) {
        const user = await this.usersRepository.findOne({
            where: { id: tenantId, role: 'tenant' },
        });
        if (!user) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        const profile = await this.tenantProfileRepository.findOne({
            where: { userId: tenantId },
        });
        const payments = await this.paymentsRepository.find({
            where: { tenantId },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                kycStatus: user.kycStatus,
            },
            creditProfile: profile || {
                creditScore: 300,
                creditTier: 'poor',
                paymentStreak: 0,
                onTimePaymentPercentage: 0,
            },
            paymentHistory: {
                total: payments.length,
                completed: payments.filter((p) => p.status === 'completed').length,
                pending: payments.filter((p) => p.status === 'pending').length,
                overdue: payments.filter((p) => p.status === 'overdue').length,
                onTimePayments: payments.filter((p) => p.isOnTime).length,
            },
            recentPayments: payments.slice(-10),
        };
    }
    async getLandlordTenants(landlordId) {
        const properties = await this.propertiesRepository.find({
            where: { landlordId, isActive: true },
        });
        const allTenantsByProperty = [];
        for (const property of properties) {
            const tenants = await this.getTenantsByProperty(property.id, landlordId);
            allTenantsByProperty.push({
                propertyId: property.id,
                propertyName: property.name,
                tenants,
            });
        }
        return allTenantsByProperty;
    }
    async getTenantReliabilityScore(tenantId) {
        const profile = await this.tenantProfileRepository.findOne({
            where: { userId: tenantId },
        });
        if (!profile) {
            return {
                score: 0,
                breakdown: {
                    creditTier: 'poor',
                    paymentStreak: 0,
                    onTimePercentage: 0,
                    totalPayments: 0,
                },
            };
        }
        return {
            score: profile.creditScore,
            breakdown: {
                creditTier: profile.creditTier,
                paymentStreak: profile.paymentStreak,
                onTimePercentage: profile.onTimePaymentPercentage,
                totalPayments: profile.totalPayments,
            },
        };
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.TenantProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Property)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map