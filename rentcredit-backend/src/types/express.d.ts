import type { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
  };
}

export {};
