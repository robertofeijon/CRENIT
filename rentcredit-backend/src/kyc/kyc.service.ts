import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KYCVerification, User } from '../entities';
import { UploadKYCDto, UpdateKYCStatusDto } from './dto/kyc.dto';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KYCVerification)
    private kycRepository: Repository<KYCVerification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async uploadKYC(userId: string, uploadKycDto: UploadKYCDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has pending KYC
    const existingKyc = await this.kycRepository.findOne({
      where: { userId, status: 'pending' },
    });

    if (existingKyc) {
      // Update existing pending KYC
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

    // Create new KYC verification
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

  async getKYCStatus(userId: string) {
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

  async verifyKYC(
    kycId: string,
    updateKycStatusDto: UpdateKYCStatusDto,
    adminId: string,
  ) {
    const kyc = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    kyc.status = updateKycStatusDto.status;
    kyc.verifiedBy = adminId;
    kyc.verifiedAt = new Date();

    if (updateKycStatusDto.status === 'rejected') {
      kyc.rejectionReason =
        updateKycStatusDto.rejectionReason || 'No reason provided';
    }

    const savedKyc = await this.kycRepository.save(kyc);

    // Update user's KYC status
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
}
