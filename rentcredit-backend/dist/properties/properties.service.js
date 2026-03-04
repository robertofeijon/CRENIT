"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
let PropertiesService = class PropertiesService {
    propertiesRepository;
    constructor(propertiesRepository) {
        this.propertiesRepository = propertiesRepository;
    }
    async createProperty(landlordId, createPropertyDto) {
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
    async getLandlordProperties(landlordId) {
        const properties = await this.propertiesRepository.find({
            where: { landlordId, isActive: true },
            order: { createdAt: 'DESC' },
        });
        return properties;
    }
    async getPropertyDetails(propertyId, landlordId) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        return property;
    }
    async updateProperty(propertyId, landlordId, updatePropertyDto) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        Object.assign(property, updatePropertyDto);
        const updatedProperty = await this.propertiesRepository.save(property);
        return {
            message: 'Property updated successfully',
            property: updatedProperty,
        };
    }
    async deleteProperty(propertyId, landlordId) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        property.isActive = false;
        await this.propertiesRepository.save(property);
        return {
            message: 'Property deleted successfully',
        };
    }
    async getPropertyStats(propertyId, landlordId) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
            relations: ['payments'],
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        const totalPayments = property.payments?.length || 0;
        const completedPayments = property.payments?.filter((p) => p.status === 'completed').length || 0;
        const pendingPayments = property.payments?.filter((p) => p.status === 'pending').length || 0;
        const totalCollected = property.payments
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
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Property)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map