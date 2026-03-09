import type { RequestWithUser } from '../types/express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(req: RequestWithUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        kycStatus: string;
        createdAt: Date;
    }>;
    updateProfile(req: RequestWithUser, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        kycStatus: string;
    }>;
    getAllUsers(role?: string): Promise<import("../entities").User[]>;
    getUser(id: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        kycStatus: string;
        createdAt: Date;
    }>;
}
