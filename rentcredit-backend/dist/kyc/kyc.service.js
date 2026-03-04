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
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
let KycService = class KycService {
    kycRepository;
    usersRepository;
    constructor(kycRepository, usersRepository) {
        this.kycRepository = kycRepository;
        this.usersRepository = usersRepository;
    }
    async uploadKYC(userId, uploadKycDto) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const existingKyc = await this.kycRepository.findOne({
            where: { userId, status: 'pending' },
        });
        if (existingKyc) {
            existingKyc.documentType = uploadKycDto.documentType;
            existingKyc.documentUrl = uploadKycDto.documentUrl;
            await this.kycRepository.save(existingKyc);
            return {
                message: 'KYC document updated successfully',
                kyc: {
                    id: existingKyc.id,
                    status: existingKyc.status,
                    documentType: existingKyc.documentType,
                },
            };
        }
        const kyc = this.kycRepository.create({
            userId,
            documentType: uploadKycDto.documentType,
            documentUrl: uploadKycDto.documentUrl,
            status: 'pending',
        });
        const savedKyc = await this.kycRepository.save(kyc);
        return {
            message: 'KYC document uploaded successfully',
            kyc: {
                id: savedKyc.id,
                status: savedKyc.status,
                documentType: savedKyc.documentType,
            },
        };
    }
    async getKYCStatus(userId) {
        const kyc = await this.kycRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        if (!kyc) {
            return {
                status: 'not_started',
                message: 'No KYC documents submitted yet',
            };
        }
        return {
            id: kyc.id,
            status: kyc.status,
            documentType: kyc.documentType,
            createdAt: kyc.createdAt,
            verifiedAt: kyc.verifiedAt,
            rejectionReason: kyc.rejectionReason,
        };
    }
    async verifyKYC(kycId, updateKycStatusDto, adminId) {
        const kyc = await this.kycRepository.findOne({ where: { id: kycId } });
        if (!kyc) {
            throw new common_1.NotFoundException('KYC record not found');
        }
        kyc.status = updateKycStatusDto.status;
        kyc.verifiedBy = adminId;
        kyc.verifiedAt = new Date();
        if (updateKycStatusDto.status === 'rejected') {
            kyc.rejectionReason =
                updateKycStatusDto.rejectionReason || 'No reason provided';
        }
        const savedKyc = await this.kycRepository.save(kyc);
        const user = await this.usersRepository.findOne({
            where: { id: kyc.userId },
        });
        if (user) {
            user.kycStatus = updateKycStatusDto.status;
            user.kycDocumentUrl = kyc.documentUrl;
            await this.usersRepository.save(user);
        }
        return {
            message: `KYC ${updateKycStatusDto.status} successfully`,
            kyc: {
                id: savedKyc.id,
                status: savedKyc.status,
                userId: savedKyc.userId,
            },
        };
    }
    async getPendingKYCs() {
        return await this.kycRepository.find({
            where: { status: 'pending' },
            order: { createdAt: 'ASC' },
        });
    }
};
exports.KycService = KycService;
exports.KycService = KycService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.KYCVerification)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], KycService);
//# sourceMappingURL=kyc.service.js.map