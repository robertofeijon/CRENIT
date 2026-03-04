import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/user.dto';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    getUser(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        kycStatus: string;
        createdAt: Date;
    }>;
    updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        kycStatus: string;
    }>;
    getAllUsers(role?: string): Promise<User[]>;
}
