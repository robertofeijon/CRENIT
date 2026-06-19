import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserProfileFromAuthHeader } from '../supabase/supabase.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('health')
  health() {
    return { success: true, data: { module: 'auth' }, error: null };
  }

  @Post('register')
  async register(
    @Body()
    body: { email: string; password: string; full_name: string; role?: string; market_data_consent?: boolean },
  ) {
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
      if (!body?.email || !body?.password) {
        throw new BadRequestException('Email and password are required');
      }
      const res = await this.authService.login(body);
      const userId = res.data?.user?.id;
      const hint = userId
        ? await this.authService.getLoginTwoFactorHint(userId, res.data?.user?.email)
        : { requires_two_factor: false, two_factor_enforced: false };
      return { success: true, data: { ...res, ...hint }, error: null };
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

  @Get('invite/:token')
  async getInvite(@Param('token') token: string) {
    try {
      const data = await this.authService.getInvitationByToken(token);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to retrieve invite');
    }
  }

  @Post('invite/:token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body() body: { password?: string; full_name: string },
  ) {
    try {
      if (!body?.full_name?.trim()) {
        throw new BadRequestException('Full name is required');
      }
      const data = await this.authService.acceptInvitation(token, {
        password: body.password,
        full_name: body.full_name.trim(),
      });
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to accept invite');
    }
  }

  @Get('2fa/status')
  async twoFactorStatus(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      const data = await this.authService.getTwoFactorStatus(profile.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new UnauthorizedException(error?.message || 'Unable to load 2FA status');
    }
  }

  @Post('2fa/setup')
  async setupTwoFactor(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      const data = await this.authService.setupTwoFactor(profile.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to start 2FA setup');
    }
  }

  @Post('2fa/confirm')
  async confirmTwoFactor(@Headers('authorization') authHeader: string, @Body() body: { code: string }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      if (!body?.code) throw new BadRequestException('code is required');
      const data = await this.authService.confirmTwoFactor(profile.id, body.code.trim());
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to confirm 2FA');
    }
  }

  @Post('2fa/disable')
  async disableTwoFactor(@Headers('authorization') authHeader: string, @Body() body: { code: string }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      if (!body?.code) throw new BadRequestException('code is required');
      const data = await this.authService.disableTwoFactor(profile.id, body.code.trim());
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to disable 2FA');
    }
  }

  @Post('2fa/verify')
  async verifyTwoFactor(@Headers('authorization') authHeader: string, @Body() body: { code: string }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      if (!body?.code) throw new BadRequestException('code is required');
      const data = await this.authService.verifyTwoFactorCode(profile.id, body.code.trim());
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Invalid 2FA code');
    }
  }

  @Post('2fa/verify-session')
  async verifyTwoFactorSession(@Headers('authorization') authHeader: string, @Body() body: { code: string }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      if (!body?.code) throw new BadRequestException('code is required');
      const data = await this.authService.verifyTwoFactorSession(profile.id, body.code.trim());
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Invalid 2FA code');
    }
  }

  @Post('2fa/sms/setup')
  async setupSmsTwoFactor(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      const data = await this.authService.setupSmsTwoFactor(profile.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to start SMS 2FA');
    }
  }

  @Post('2fa/sms/confirm')
  async confirmSmsTwoFactor(@Headers('authorization') authHeader: string, @Body() body: { code: string }) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      if (!body?.code) throw new BadRequestException('code is required');
      const data = await this.authService.confirmSmsTwoFactor(profile.id, body.code.trim());
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to confirm SMS 2FA');
    }
  }

  @Post('2fa/sms/send-challenge')
  async sendSmsTwoFactorChallenge(@Headers('authorization') authHeader: string) {
    try {
      const { profile } = await getUserProfileFromAuthHeader(this.supabaseService.getClient(), authHeader, {
        skipTwoFactor: true,
      });
      const data = await this.authService.sendSmsTwoFactorChallenge(profile.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to send SMS code');
    }
  }
}
