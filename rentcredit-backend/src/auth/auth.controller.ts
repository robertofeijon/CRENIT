import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import type { RequestWithUser } from '../types/express';
import { AuthService } from './auth.service';
import { SignUpDto, LoginDto, RoleSwitchDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signUpDto: SignUpDto) {
    return await this.authService.signup(signUpDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('switch-role')
  @UseGuards(JwtAuthGuard)
  async switchRole(
    @Request() req: RequestWithUser,
    @Body() roleSwitchDto: RoleSwitchDto,
  ) {
    return await this.authService.switchRole(req.user!.userId, roleSwitchDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: RequestWithUser) {
    return {
      user: req.user,
    };
  }
}
