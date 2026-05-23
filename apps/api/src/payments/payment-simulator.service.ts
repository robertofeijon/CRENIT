import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentSimulatorService {
  async processPayment(payload: {
    amount: number;
    tenantId: string;
    landlordId: string;
    method: 'EFT' | 'CARD' | 'MOBILE_MONEY';
  }): Promise<{ success: boolean; transactionId: string; processingMs: number }> {
    const delay = 1000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = Math.random() > 0.05;
    const transactionId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return { success, transactionId, processingMs: Math.round(delay) };
  }
}
