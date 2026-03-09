"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const bcrypt = __importStar(require("bcryptjs"));
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
const entities_1 = require("./entities");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin ||
                (typeof origin === 'string' && origin.startsWith('http://localhost'))) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = process.env.PORT || 3000;
    await app.listen(port, () => {
        console.log(`🚀 RentCredit API running on http://localhost:${port}`);
    });
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        if (dataSource && dataSource.isInitialized) {
            const userRepo = dataSource.getRepository(entities_1.User);
            const propertyRepo = dataSource.getRepository(entities_1.Property);
            const paymentRepo = dataSource.getRepository(entities_1.Payment);
            const tenantProfileRepo = dataSource.getRepository(entities_1.TenantProfile);
            const ensure = async (email, pwd, role, name) => {
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
            const tenant = await ensure('tenant@example.com', 'tenant123', 'tenant', 'Demo Tenant');
            const landlord = await ensure('landlord@example.com', 'landlord123', 'landlord', 'Demo Landlord');
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
    }
    catch (err) {
        console.warn('seeding failed', err.message);
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map