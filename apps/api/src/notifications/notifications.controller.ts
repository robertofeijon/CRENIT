import { BadRequestException, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { getUserFromAuthHeader } from '../supabase/supabase.utils';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async list(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const data = await this.notificationsService.listForUser(user.id, 25);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to load notifications');
    }
  }

  @Get('unread')
  async listUnread(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const data = await this.notificationsService.listUnreadForUser(user.id, 10);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to load unread notifications');
    }
  }

  @Post(':notificationId/read')
  async markRead(@Headers('authorization') authHeader: string, @Param('notificationId') notificationId: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const data = await this.notificationsService.markRead(user.id, notificationId);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to mark notification as read');
    }
  }

  @Post('read-all')
  async markAllRead(@Headers('authorization') authHeader: string) {
    try {
      const user = await getUserFromAuthHeader(this.supabaseService.getClient(), authHeader);
      const data = await this.notificationsService.markAllRead(user.id);
      return { success: true, data, error: null };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Unable to mark notifications as read');
    }
  }
}
