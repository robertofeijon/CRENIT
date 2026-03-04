import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { TenantProfile } from '../entities/tenant-profile.entity';
import { SignUpDto, LoginDto, RoleSwitchDto } from './dto/auth.dto';
export declare class AuthService {
    private usersRepository;
    private tenantProfileRepository;
    private jwtService;
    constructor(usersRepository: Repository<User>, tenantProfileRepository: Repository<TenantProfile>, jwtService: JwtService);
    signup(signUpDto: SignUpDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            kycStatus: string;
        };
        access_token: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            kycStatus: string;
        };
        access_token: string;
    }>;
    switchRole(userId: string, roleSwitchDto: RoleSwitchDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
        access_token: string;
    }>;
    private generateToken;
}
