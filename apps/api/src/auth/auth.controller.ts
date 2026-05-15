import { BadRequestException, Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'auth' }, error: null };
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; full_name: string; role?: string }) {
    try {
      const res = await this.authService.register(body);
      return { success: true, data: res, error: null };
    } catch (error: any) {
      const message = error?.message || 'Registration failed.';
      throw new BadRequestException(message);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const res = await this.authService.login(body);
      return { success: true, data: res, error: null };
    } catch (error: any) {
      const message = error?.message || 'Login failed.';
      throw new BadRequestException(message);
    }
  }

  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    try {
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const result = await this.authService.getProfileByToken(token);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      const message = error?.message || 'Unable to fetch profile.';
      throw new UnauthorizedException(message);
    }
  }
}
