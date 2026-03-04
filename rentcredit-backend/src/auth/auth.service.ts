import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { TenantProfile } from '../entities/tenant-profile.entity';
import { SignUpDto, LoginDto, RoleSwitchDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TenantProfile)
    private tenantProfileRepository: Repository<TenantProfile>,
    private jwtService: JwtService,
  ) {}

  async signup(signUpDto: SignUpDto) {
    const { email, password, fullName, role, phoneNumber } = signUpDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      fullName,
      role,
      phoneNumber,
      kycStatus: 'pending',
    });

    const savedUser = await this.usersRepository.save(user);

    // Create tenant profile if user is a tenant
    if (role === 'tenant') {
      await this.tenantProfileRepository.save({
        userId: savedUser.id,
        creditScore: 300,
        creditTier: 'poor',
        paymentStreak: 0,
        totalPayments: 0,
        onTimePayments: 0,
        onTimePaymentPercentage: 0,
      });
    }

    // Generate JWT token
    const token = this.generateToken(savedUser);

    return {
      message: 'User created successfully',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        role: savedUser.role,
        kycStatus: savedUser.kycStatus,
      },
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      access_token: token,
    };
  }

  async switchRole(userId: string, roleSwitchDto: RoleSwitchDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update user role
    user.role = roleSwitchDto.role;
    await this.usersRepository.save(user);

    // Generate new token with new role
    const token = this.generateToken(user);

    return {
      message: 'Role switched successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      access_token: token,
    };
  }

  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
