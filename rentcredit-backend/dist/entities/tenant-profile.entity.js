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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantProfile = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let TenantProfile = class TenantProfile {
    id;
    userId;
    creditScore;
    paymentStreak;
    totalPayments;
    onTimePayments;
    creditTier;
    onTimePaymentPercentage;
    createdAt;
    updatedAt;
    user;
};
exports.TenantProfile = TenantProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TenantProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TenantProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 300 }),
    __metadata("design:type", Number)
], TenantProfile.prototype, "creditScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TenantProfile.prototype, "paymentStreak", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TenantProfile.prototype, "totalPayments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TenantProfile.prototype, "onTimePayments", void 0);
__decorate([
    (0, typeorm_1.Column)('enum', {
        enum: ['poor', 'fair', 'good', 'excellent'],
        default: 'poor',
    }),
    __metadata("design:type", String)
], TenantProfile.prototype, "creditTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TenantProfile.prototype, "onTimePaymentPercentage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TenantProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TenantProfile.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.tenantProfile),
    __metadata("design:type", user_entity_1.User)
], TenantProfile.prototype, "user", void 0);
exports.TenantProfile = TenantProfile = __decorate([
    (0, typeorm_1.Entity)('tenant_profiles')
], TenantProfile);
//# sourceMappingURL=tenant-profile.entity.js.map