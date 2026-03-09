import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User, Property, Payment, TenantProfile } from './entities';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      // allow requests from any localhost development port
      if (
        !origin ||
        (typeof origin === 'string' && origin.startsWith('http://localhost'))
      ) {
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
    const dataSource = app.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      const userRepo = dataSource.getRepository(User);
      const propertyRepo = dataSource.getRepository(Property);
      const paymentRepo = dataSource.getRepository(Payment);
      const tenantProfileRepo = dataSource.getRepository(TenantProfile);

      const ensure = async (
        email: string,
        pwd: string,
        role: string,
        name: string,
      ) => {
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
          return await userRepo.findOne({ where: { email } });
        }
        return u;
      };

      const tenant = await ensure(
        'tenant@example.com',
        'tenant123',
        'tenant',
        'Demo Tenant',
      );
      const landlord = await ensure(
        'landlord@example.com',
        'landlord123',
        'landlord',
        'Demo Landlord',
      );

      // Seed property
      let property = await propertyRepo.findOne({
        where: { address: '123 Main St, Apt 4B' },
      });
      if (!property && landlord) {
        property = await propertyRepo.save({
          landlordId: landlord.id,
          name: 'Downtown 2BR Apartment',
          address: '123 Main St, Apt 4B',
          city: 'New York',
          state: 'NY',
          rentAmount: 1450,
          description: 'Beautiful 2BR apartment in downtown',
        });
        console.log('💾 created demo property');
      }

      // Seed tenant profile
      if (tenant) {
        const profile = await tenantProfileRepo.findOne({
          where: { userId: tenant.id },
        });
        if (!profile) {
          await tenantProfileRepo.save({
            userId: tenant.id,
            creditScore: 720,
            paymentStreak: 3,
            totalPayments: 4,
            onTimePayments: 3,
            creditTier: 'good',
            onTimePaymentPercentage: 75.0,
          });
          console.log('💾 created demo tenant profile');
        }
      }

      // Seed payments
      if (tenant && property) {
        const existingPayments = await paymentRepo.count({
          where: { tenantId: tenant.id },
        });
        if (existingPayments === 0) {
          const payments = [
            { dueDate: '2025-06-01', amount: 1450, status: 'pending' },
            { dueDate: '2025-05-01', amount: 1450, status: 'paid' },
            { dueDate: '2025-04-01', amount: 1450, status: 'paid' },
            { dueDate: '2025-03-01', amount: 1450, status: 'paid' },
          ];

          for (const p of payments) {
            await paymentRepo.save({
              tenantId: tenant.id,
              propertyId: property.id,
              amount: p.amount,
              dueDate: new Date(p.dueDate),
              status: p.status,
            });
          }
          console.log('💾 created demo payments');
        }
      }
    }
  } catch (err) {
    console.warn('seeding failed', (err as Error).message);
  }
}
void bootstrap();
