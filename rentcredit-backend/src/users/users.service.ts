import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getUser(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
    };
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      kycStatus: updatedUser.kycStatus,
    };
  }

  async getAllUsers(role?: string) {
    let query = this.usersRepository.createQueryBuilder('user');

    if (role) {
      query = query.where('user.role = :role', { role });
    }

    const users = await query
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.role',
        'user.kycStatus',
        'user.createdAt',
      ])
      .getMany();

    return users;
  }
}
