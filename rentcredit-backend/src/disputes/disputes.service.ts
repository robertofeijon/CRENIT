import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, Payment, User } from '../entities';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private disputesRepository: Repository<Dispute>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getAllDisputes() {
    const disputes = await this.disputesRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['tenant', 'landlord', 'payment', 'resolvedByAdmin'],
    });

    return disputes.map((d) => this.formatDispute(d));
  }

  async getLandlordDisputes(landlordId: string) {
    const disputes = await this.disputesRepository.find({
      where: { landlordId },
      order: { createdAt: 'DESC' },
      relations: ['tenant', 'landlord', 'payment'],
    });

    return disputes.map((d) => this.formatDispute(d));
  }

  async getTenantDisputes(tenantId: string) {
    const disputes = await this.disputesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: ['tenant', 'landlord', 'payment'],
    });

    return disputes.map((d) => this.formatDispute(d));
  }

  async createDispute(
    userId: string,
    paymentId: string,
    type: string,
    reason: string,
    description: string,
    amount?: number,
  ) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: ['property'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Get the property details to find landlord
    const property = payment.property;

    // Create dispute
    const dispute = this.disputesRepository.create({
      paymentId,
      tenantId: payment.tenantId,
      landlordId: property.landlordId,
      type,
      reason,
      description,
      amount: amount || payment.amount,
      status: 'open',
    });

    const saved = await this.disputesRepository.save(dispute);

    return {
      message: 'Dispute created successfully',
      dispute: this.formatDispute(saved),
    };
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    status: 'resolved' | 'rejected',
    resolution: string,
  ) {
    const dispute = await this.disputesRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    dispute.status = status;
    dispute.resolution = resolution;
    dispute.resolvedByAdminId = adminId;
    dispute.resolutionDate = new Date();

    const saved = await this.disputesRepository.save(dispute);

    return {
      message: `Dispute ${status} successfully`,
      dispute: this.formatDispute(saved),
    };
  }

  private formatDispute(dispute: Dispute) {
    return {
      id: dispute.id,
      paymentId: dispute.paymentId,
      tenantId: dispute.tenantId,
      tenantName: dispute.tenant?.fullName || 'Unknown Tenant',
      landlordId: dispute.landlordId,
      landlordName: dispute.landlord?.fullName || 'Unknown Landlord',
      type: dispute.type,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      amount: dispute.amount,
      resolution: dispute.resolution,
      notes: dispute.resolution,
      resolvedByAdmin: dispute.resolvedByAdmin?.fullName,
      createdAt: dispute.createdAt,
      resolutionDate: dispute.resolutionDate,
    };
  }
}
