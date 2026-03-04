import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RoleGuard } from '../auth/guards/role.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async createProperty(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    return await this.propertiesService.createProperty(
      req.user.userId,
      createPropertyDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getLandlordProperties(
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.propertiesService.getLandlordProperties(req.user.userId);
  }

  @Get(':propertyId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getPropertyDetails(
    @Param('propertyId') propertyId: string,
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.propertiesService.getPropertyDetails(
      propertyId,
      req.user.userId,
    );
  }

  @Get(':propertyId/stats')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async getPropertyStats(
    @Param('propertyId') propertyId: string,
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.propertiesService.getPropertyStats(
      propertyId,
      req.user.userId,
    );
  }

  @Put(':propertyId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async updateProperty(
    @Param('propertyId') propertyId: string,
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return await this.propertiesService.updateProperty(
      propertyId,
      req.user.userId,
      updatePropertyDto,
    );
  }

  @Delete(':propertyId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('landlord')
  async deleteProperty(
    @Param('propertyId') propertyId: string,
    @Request() req: ExpressRequest & { user: { userId: string } },
  ) {
    return await this.propertiesService.deleteProperty(
      propertyId,
      req.user.userId,
    );
  }
}
