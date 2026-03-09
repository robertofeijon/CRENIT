import { Request as ExpressRequest } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
export declare class PropertiesController {
    private propertiesService;
    constructor(propertiesService: PropertiesService);
    getAvailableProperties(): Promise<{
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        monthlyRent: number;
        unitCount: number;
        images: string[];
    }[]>;
    createProperty(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, createPropertyDto: CreatePropertyDto): Promise<{
        message: string;
        property: {
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            monthlyRent: number;
        };
    }>;
    getLandlordProperties(req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<import("../entities").Property[]>;
    getPropertyDetails(propertyId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<import("../entities").Property>;
    getPropertyStats(propertyId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<{
        property: {
            id: string;
            name: string;
            address: string;
        };
        stats: {
            totalPayments: number;
            completedPayments: number;
            pendingPayments: number;
            totalCollected: number;
            monthlyRent: number;
        };
    }>;
    updateProperty(propertyId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, updatePropertyDto: UpdatePropertyDto): Promise<{
        message: string;
        property: import("../entities").Property;
    }>;
    deleteProperty(propertyId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }): Promise<{
        message: string;
    }>;
    uploadPropertyImage(propertyId: string, req: ExpressRequest & {
        user: {
            userId: string;
        };
    }, file: Express.Multer.File): Promise<{
        message: string;
        imageUrl: string;
    }>;
}
