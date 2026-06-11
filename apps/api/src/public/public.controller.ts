import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('contact')
  async contact(@Body() body: { name?: string; email?: string; subject?: string; message?: string }) {
    if (!body) throw new BadRequestException('Request body is required');
    const result = await this.publicService.submitContact({
      name: body.name || '',
      email: body.email || '',
      subject: body.subject || '',
      message: body.message || '',
    });
    return { success: true, data: result, error: null };
  }
}
