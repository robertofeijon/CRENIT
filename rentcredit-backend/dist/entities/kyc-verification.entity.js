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
exports.KYCVerification = void 0;
const typeorm_1 = require("typeorm");
let KYCVerification = class KYCVerification {
    id;
    userId;
    documentType;
    documentUrl;
    verifiedDocumentUrl;
    status;
    rejectionReason;
    verifiedAt;
    verifiedBy;
    createdAt;
    updatedAt;
};
exports.KYCVerification = KYCVerification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KYCVerification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KYCVerification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KYCVerification.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KYCVerification.prototype, "documentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], KYCVerification.prototype, "verifiedDocumentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)('enum', {
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], KYCVerification.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], KYCVerification.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], KYCVerification.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], KYCVerification.prototype, "verifiedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KYCVerification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], KYCVerification.prototype, "updatedAt", void 0);
exports.KYCVerification = KYCVerification = __decorate([
    (0, typeorm_1.Entity)('kyc_verifications')
], KYCVerification);
//# sourceMappingURL=kyc-verification.entity.js.map