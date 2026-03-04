import { Controller, Get, Put, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return await this.usersService.getUser(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.updateUser(req.user.userId, updateUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Query('role') role?: string) {
    return await this.usersService.getAllUsers(role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Request() req) {
    return await this.usersService.getUser(req.params.id);
  }
}
