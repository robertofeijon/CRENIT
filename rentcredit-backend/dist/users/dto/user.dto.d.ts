export declare class UpdateUserDto {
    fullName?: string;
    phoneNumber?: string;
}
export declare class GetUserDto {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    kycStatus: string;
    createdAt: Date;
}
