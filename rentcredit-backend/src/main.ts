import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      // allow requests from any localhost development port
      if (!origin || origin.startsWith('http://localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    console.log(`🚀 RentCredit API running on http://localhost:${port}`);
  });

  // development seed accounts (tenant/landlord) --------------------------------
  try {
    const userRepo = app.get('UserRepository');
    if (userRepo) {
      const bcrypt = require('bcryptjs');
      const ensure = async (email: string, pwd: string, role: string, name: string) => {
        const u = await userRepo.findOne({ where: { email } });
        if (!u) {
          await userRepo.save({
            email,
            password: await bcrypt.hash(pwd, 10),
            fullName: name,
            role,
            kycStatus: 'verified',
          });
          console.log(`💾 created demo ${role} (${email} / ${pwd})`);
        }
      };
      await ensure('tenant@example.com', 'tenant123', 'tenant', 'Demo Tenant');
      await ensure('landlord@example.com', 'landlord123', 'landlord', 'Demo Landlord');
    }
  } catch (err) {
    console.warn('seeding users failed', err.message);
  }
}
bootstrap();
