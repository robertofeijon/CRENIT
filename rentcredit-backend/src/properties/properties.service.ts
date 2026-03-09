import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import * as fs from 'fs';
import * as path from 'path';

interface MulterFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
  ) {}

  async createProperty(
    landlordId: string,
    createPropertyDto: CreatePropertyDto,
  ) {
    const property = this.propertiesRepository.create({
      landlordId,
      ...createPropertyDto,
    });

    const savedProperty = await this.propertiesRepository.save(property);

    return {
      message: 'Property created successfully',
      property: {
        id: savedProperty.id,
        name: savedProperty.name,
        address: savedProperty.address,
        city: savedProperty.city,
        state: savedProperty.state,
        monthlyRent: savedProperty.monthlyRent,
      },
    };
  }

  async getLandlordProperties(landlordId: string) {
    const properties = await this.propertiesRepository.find({
      where: { landlordId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return properties;
  }

  async getPropertyDetails(propertyId: string, landlordId: string) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async updateProperty(
    propertyId: string,
    landlordId: string,
    updatePropertyDto: UpdatePropertyDto,
  ) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    Object.assign(property, updatePropertyDto);
    const updatedProperty = await this.propertiesRepository.save(property);

    return {
      message: 'Property updated successfully',
      property: updatedProperty,
    };
  }

  async deleteProperty(propertyId: string, landlordId: string) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    property.isActive = false;
    await this.propertiesRepository.save(property);

    return {
      message: 'Property deleted successfully',
    };
  }

  async getPropertyStats(propertyId: string, landlordId: string) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
      relations: ['payments'],
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const totalPayments = property.payments?.length || 0;
    const completedPayments =
      property.payments?.filter((p) => p.status === 'completed').length || 0;
    const pendingPayments =
      property.payments?.filter((p) => p.status === 'pending').length || 0;
    const totalCollected =
      property.payments
        ?.filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

    return {
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
      },
      stats: {
        totalPayments,
        completedPayments,
        pendingPayments,
        totalCollected,
        monthlyRent: property.monthlyRent,
      },
    };
  }

  async uploadPropertyImage(
    propertyId: string,
    landlordId: string,
    file: MulterFile,
  ) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Update property images array
    const imageUrl = `/uploads/${uniqueFilename}`;
    if (!property.images) {
      property.images = [] as string[];
    }
    (property.images as string[]).push(imageUrl);

    await this.propertiesRepository.save(property);

    return {
      message: 'Image uploaded successfully',
      imageUrl,
    };
  }

  async getAvailableProperties() {
    const properties = await this.propertiesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'address', 'city', 'state', 'monthlyRent', 'unitCount', 'images'],
    });

    return properties.map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      monthlyRent: p.monthlyRent,
      unitCount: p.unitCount,
      images: p.images || [],
    }));
  }
}
