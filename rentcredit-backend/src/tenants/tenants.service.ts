import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, TenantProfile, Property, Payment } from '../entities';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TenantProfile)
    private tenantProfileRepository: Repository<TenantProfile>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async getTenantsByProperty(propertyId: string, landlordId: string) {
    // Verify property belongs to landlord
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId, landlordId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Get all payments for this property
    const payments = await this.paymentsRepository.find({
      where: { propertyId },
    });

    // Get unique tenant IDs
    const tenantIds = [...new Set(payments.map((p) => p.tenantId))];

    // Get tenant details with profiles
    const tenants = await Promise.all(
      tenantIds.map(async (tenantId) => {
        const user = await this.usersRepository.findOne({
          where: { id: tenantId },
        });
        const profile = await this.tenantProfileRepository.findOne({
          where: { userId: tenantId },
        });
        const tenantPayments = payments.filter((p) => p.tenantId === tenantId);

        return {
          user: {
            id: user?.id,
            email: user?.email,
            fullName: user?.fullName,
            phoneNumber: user?.phoneNumber,
          },
          creditProfile: profile || null,
          paymentHistory: {
            total: tenantPayments.length,
            completed: tenantPayments.filter((p) => p.status === 'completed')
              .length,
            pending: tenantPayments.filter((p) => p.status === 'pending')
              .length,
            overdue: tenantPayments.filter((p) => p.status === 'overdue')
              .length,
          },
        };
      }),
    );

    return tenants;
  }

  async getTenantProfile(tenantId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: tenantId, role: 'tenant' },
    });

    if (!user) {
      throw new NotFoundException('Tenant not found');
    }

    const profile = await this.tenantProfileRepository.findOne({
      where: { userId: tenantId },
    });
    const payments = await this.paymentsRepository.find({
      where: { tenantId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        kycStatus: user.kycStatus,
      },
      creditProfile: profile || {
        creditScore: 300,
        creditTier: 'poor',
        paymentStreak: 0,
        onTimePaymentPercentage: 0,
      },
      paymentHistory: {
        total: payments.length,
        completed: payments.filter((p) => p.status === 'completed').length,
        pending: payments.filter((p) => p.status === 'pending').length,
        overdue: payments.filter((p) => p.status === 'overdue').length,
        onTimePayments: payments.filter((p) => p.isOnTime).length,
      },
      recentPayments: payments.slice(-10),
    };
  }

  async getLandlordTenants(landlordId: string): Promise<
    Array<{
      propertyId: string;
      propertyName: string;
      tenants: Array<{
        user: {
          id: string | undefined;
          email: string | undefined;
          fullName: string | undefined;
          phoneNumber: string | undefined;
        };
        creditProfile: unknown;
        paymentHistory: {
          total: number;
          completed: number;
          pending: number;
          overdue: number;
        };
      }>;
    }>
  > {
    const properties = await this.propertiesRepository.find({
      where: { landlordId, isActive: true },
    });

    const allTenantsByProperty: Array<{
      propertyId: string;
      propertyName: string;
      tenants: Array<{
        user: {
          id: string | undefined;
          email: string | undefined;
          fullName: string | undefined;
          phoneNumber: string | undefined;
        };
        creditProfile: unknown;
        paymentHistory: {
          total: number;
          completed: number;
          pending: number;
          overdue: number;
        };
      }>;
    }> = [];
    for (const property of properties) {
      const tenants = await this.getTenantsByProperty(property.id, landlordId);
      allTenantsByProperty.push({
        propertyId: property.id,
        propertyName: property.name,
        tenants,
      });
    }
    return allTenantsByProperty;
  }

  async getTenantReliabilityScore(tenantId: string) {
    const profile = await this.tenantProfileRepository.findOne({
      where: { userId: tenantId },
    });

    if (!profile) {
      return {
        score: 0,
        breakdown: {
          creditTier: 'poor',
          paymentStreak: 0,
          onTimePercentage: 0,
          totalPayments: 0,
        },
      };
    }

    return {
      score: profile.creditScore,
      breakdown: {
        creditTier: profile.creditTier,
        paymentStreak: profile.paymentStreak,
        onTimePercentage: profile.onTimePaymentPercentage,
        totalPayments: profile.totalPayments,
      },
    };
  }
}
