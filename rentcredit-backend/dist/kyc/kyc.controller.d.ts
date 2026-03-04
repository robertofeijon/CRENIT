import { KycService } from './kyc.service';
import { UploadKYCDto, UpdateKYCStatusDto } from './dto/kyc.dto';
export declare class KycController {
    private kycService;
    constructor(kycService: KycService);
    uploadKYC(req: any, uploadKycDto: UploadKYCDto): Promise<{
        message: string;
        kyc: {
            id: string;
            status: string;
            documentType: string;
        };
    }>;
    getKYCStatus(req: any): Promise<{
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
    getPendingKYCs(): Promise<import("../entities").KYCVerification[]>;
    verifyKYC(kycId: string, updateKycStatusDto: UpdateKYCStatusDto, req: any): Promise<{
        message: string;
        kyc: {
            id: string;
            status: string;
            userId: string;
        };
    }>;
}
