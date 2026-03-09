"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
    async uploadPropertyImage(propertyId, landlordId, file) {
        const property = await this.propertiesRepository.findOne({
            where: { id: propertyId, landlordId },
        });
        if (!property) {
            throw new common_1.NotFoundException('Property not found');
        }
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
        const filePath = path.join(uploadsDir, uniqueFilename);
        fs.writeFileSync(filePath, file.buffer);
        const imageUrl = `/uploads/${uniqueFilename}`;
        if (!property.images) {
            property.images = [];
        }
        property.images.push(imageUrl);
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
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Property)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map