import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, Property, TenantProfile } from '../entities';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  RecordPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Property)
    private propertiesRepository: Repository<Property>,
    @InjectRepository(TenantProfile)
    private tenantProfileRepository: Repository<TenantProfile>,
  ) {}

  async createPayment(tenantId: string, createPaymentDto: CreatePaymentDto) {
    const property = await this.propertiesRepository.findOne({
      where: { id: createPaymentDto.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const payment = this.paymentsRepository.create({
      tenantId,
      propertyId: createPaymentDto.propertyId,
      amount: createPaymentDto.amount,
      dueDate: new Date(createPaymentDto.dueDate),
      status: 'pending',
      notes: createPaymentDto.notes,
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    return {
      message: 'Payment created successfully',
      payment: {
        id: savedPayment.id,
        amount: savedPayment.amount,
        dueDate: savedPayment.dueDate,
        status: savedPayment.status,
      },
    };
  }

  async recordPayment(
    paymentId: string,
    tenantId: string,
    recordPaymentDto: RecordPaymentDto,
  ) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized to record this payment');
    }

    const now = new Date();
    const isOnTime = now <= payment.dueDate;

    payment.status = 'completed';
    payment.paidAt = now;
    payment.isOnTime = isOnTime;
    if (recordPaymentDto.receiptUrl) {
      payment.receiptUrl = recordPaymentDto.receiptUrl;
    }
    if (recordPaymentDto.notes) {
      payment.notes = recordPaymentDto.notes;
    }

    const savedPayment = await this.paymentsRepository.save(payment);

    // Update tenant profile
    await this.updateTenantProfile(tenantId, isOnTime);

    return {
      message: 'Payment recorded successfully',
      payment: {
        id: savedPayment.id,
        status: savedPayment.status,
        paidAt: savedPayment.paidAt,
        isOnTime: savedPayment.isOnTime,
      },
    };
  }

  async getRentDue(tenantId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { tenantId, status: 'pending' },
      order: { dueDate: 'ASC' },
    });

    if (!payment) {
      return { amount: '$0', due: null };
    }

    return {
      amount: `$${payment.amount}`,
      due: payment.dueDate.toISOString().split('T')[0],
    };
  }

  async getTenantPayments(tenantId: string, status?: string) {
    let query = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId });

    if (status) {
      query = query.andWhere('payment.status = :status', { status });
    }

    const payments = await query.orderBy('payment.dueDate', 'DESC').getMany();

    return payments;
  }

  async getPropertyPayments(propertyId: string) {
    return await this.paymentsRepository.find({
      where: { propertyId },
      order: { dueDate: 'DESC' },
    });
  }

  async getPaymentDetails(paymentId: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = updatePaymentStatusDto.status;
    if (updatePaymentStatusDto.notes) {
      payment.notes = updatePaymentStatusDto.notes;
    }

    const savedPayment = await this.paymentsRepository.save(payment);

    return {
      message: 'Payment status updated',
      payment: {
        id: savedPayment.id,
        status: savedPayment.status,
      },
    };
  }

  private async updateTenantProfile(tenantId: string, isOnTime: boolean) {
    let profile = await this.tenantProfileRepository.findOne({
      where: { userId: tenantId },
    });

    if (!profile) {
      // Create profile if doesn't exist
      profile = this.tenantProfileRepository.create({
        userId: tenantId,
        creditScore: 300,
        creditTier: 'poor',
      });
    }

    // Update payment stats
    profile.totalPayments += 1;
    if (isOnTime) {
      profile.onTimePayments += 1;
      profile.paymentStreak += 1;
    } else {
      profile.paymentStreak = 0;
    }

    profile.onTimePaymentPercentage = Math.round(
      (profile.onTimePayments / profile.totalPayments) * 100,
    );

    // Update credit score (simple calculation for Phase 1)
    const baseScore = 300;
    const streakBonus = Math.min(profile.paymentStreak * 10, 200);
    const onTimeBonus = Math.round(profile.onTimePaymentPercentage * 3);
    profile.creditScore = Math.min(baseScore + streakBonus + onTimeBonus, 850);

    // Update credit tier
    if (profile.creditScore >= 750) {
      profile.creditTier = 'excellent';
    } else if (profile.creditScore >= 670) {
      profile.creditTier = 'good';
    } else if (profile.creditScore >= 580) {
      profile.creditTier = 'fair';
    } else {
      profile.creditTier = 'poor';
    }

    await this.tenantProfileRepository.save(profile);
  }
}
