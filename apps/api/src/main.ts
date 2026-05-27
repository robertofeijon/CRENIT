import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { validateRequiredEnv } from './common/env.validation';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  validateRequiredEnv();
  const app = await NestFactory.create(AppModule);
  const rateLimit = new RateLimitMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => rateLimit.use(req, res, next));
  // capture raw body for webhook signature verification
  app.use(bodyParser.json({ verify: (req: any, _res, buf) => { req.rawBody = buf.toString(); } }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigin,
  });
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

bootstrap();
