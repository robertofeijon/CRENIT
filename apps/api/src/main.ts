import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './common/security-headers.middleware';
import { createCorsOriginValidator, getCorsOrigins } from './common/cors.config';
import { validateRequiredEnv } from './common/env.validation';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  validateRequiredEnv();
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : undefined,
  });

  const corsOrigins = getCorsOrigins();
  app.enableCors({
    origin: createCorsOriginValidator(corsOrigins),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const securityHeaders = new SecurityHeadersMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => securityHeaders.use(req, res, next));

  const rateLimit = new RateLimitMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => rateLimit.use(req, res, next));

  app.use(
    bodyParser.json({
      limit: '12mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`CRENIT API listening on 0.0.0.0:${port}`);
  // eslint-disable-next-line no-console
  console.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
}

bootstrap();
