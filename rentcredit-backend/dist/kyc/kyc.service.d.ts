import { Repository } from 'typeorm';
import { KYCVerification, User } from '../entities';
import { UploadKYCDto, UpdateKYCStatusDto } from './dto/kyc.dto';
export declare class KycService {
    private kycRepository;
    private usersRepository;
    constructor(kycRepository: Repository<KYCVerification>, usersRepository: Repository<User>);
    uploadKYC(userId: string, uploadKycDto: UploadKYCDto): Promise<{
        message: string;
        kyc: {
            id: string;
            status: string;
            documentType: string;
        };
    }>;
    getKYCStatus(userId: string): Promise<{
        status: string;
        message: string;
        id?: undefined;
        documentType?: undefined;
        createdAt?: undefined;
        verifiedAt?: undefined;
        rejectionReason?: undefined;
    } | {
        id: string;
        status: string;
        documentType: string;
        createdAt: Date;
        verifiedAt: Date;
        rejectionReason: string;
        message?: undefined;
    }>;
    verifyKYC(kycId: string, updateKycStatusDto: UpdateKYCStatusDto, adminId: string): Promise<{
        message: string;
        kyc: {
            id: string;
            status: string;
            userId: string;
        };
    }>;
    getPendingKYCs(): Promise<KYCVerification[]>;
}
