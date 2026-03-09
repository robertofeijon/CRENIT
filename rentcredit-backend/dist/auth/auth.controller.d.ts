import type { RequestWithUser } from '../types/express';
import { AuthService } from './auth.service';
import { SignUpDto, LoginDto, RoleSwitchDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    switchRole(req: RequestWithUser, roleSwitchDto: RoleSwitchDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
        access_token: string;
    }>;
    getProfile(req: RequestWithUser): {
        user: {
            userId: string;
            email: string;
            role: string;
            iat: number;
            exp: number;
        } | undefined;
    };
}
