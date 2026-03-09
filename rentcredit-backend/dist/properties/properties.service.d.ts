import { Repository } from 'typeorm';
import { Property } from '../entities';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
interface MulterFile {
    originalname: string;
    buffer: Buffer;
}
export declare class PropertiesService {
    private propertiesRepository;
    constructor(propertiesRepository: Repository<Property>);
    createProperty(landlordId: string, createPropertyDto: CreatePropertyDto): Promise<{
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
    getLandlordProperties(landlordId: string): Promise<Property[]>;
    getPropertyDetails(propertyId: string, landlordId: string): Promise<Property>;
    updateProperty(propertyId: string, landlordId: string, updatePropertyDto: UpdatePropertyDto): Promise<{
        message: string;
        property: Property;
    }>;
    deleteProperty(propertyId: string, landlordId: string): Promise<{
        message: string;
    }>;
    getPropertyStats(propertyId: string, landlordId: string): Promise<{
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
    uploadPropertyImage(propertyId: string, landlordId: string, file: MulterFile): Promise<{
        message: string;
        imageUrl: string;
    }>;
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
}
export {};
