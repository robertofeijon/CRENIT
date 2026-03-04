import { Controller, Post, Get, Put, Body, UseGuards, Request, Param } from '@nestjs/common';
import { KycService } from './kyc.service';
import { UploadKYCDto, UpdateKYCStatusDto } from './dto/kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RoleGuard } from '../auth/guards/role.guard';

@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  async uploadKYC(@Request() req, @Body() uploadKycDto: UploadKYCDto) {
    return await this.kycService.uploadKYC(req.user.userId, uploadKycDto);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getKYCStatus(@Request() req) {
    return await this.kycService.getKYCStatus(req.user.userId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async getPendingKYCs() {
    return await this.kycService.getPendingKYCs();
  }

  @Put('verify/:kycId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async verifyKYC(
    @Param('kycId') kycId: string,
    @Body() updateKycStatusDto: UpdateKYCStatusDto,
    @Request() req,
  ) {
    return await this.kycService.verifyKYC(kycId, updateKycStatusDto, req.user.userId);
  }
}
