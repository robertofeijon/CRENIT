import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

type TokenPayload = {
  paymentId: string;
  landlordUserId: string;
  exp: number;
};

@Injectable()
export class PaymentConfirmTokenService {
  private secret() {
    const s = process.env.JWT_SECRET?.trim();
    if (!s || s.length < 16) {
      throw new BadRequestException('JWT_SECRET is required for payment confirmation links');
    }
    return s;
  }

  sign(paymentId: string, landlordUserId: string, ttlHours = 72): string {
    const payload: TokenPayload = {
      paymentId,
      landlordUserId,
      exp: Math.floor(Date.now() / 1000) + ttlHours * 3600,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret()).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): TokenPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig) {
      throw new UnauthorizedException('Invalid confirmation link');
    }
    const expected = createHmac('sha256', this.secret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid confirmation link');
    }
    let payload: TokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid confirmation link');
    }
    if (!payload.paymentId || !payload.landlordUserId || !payload.exp) {
      throw new UnauthorizedException('Invalid confirmation link');
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('This confirmation link has expired');
    }
    return payload;
  }
}
