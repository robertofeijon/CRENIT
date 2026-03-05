"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || origin.startsWith('http://localhost')) {
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
        const userRepo = app.get('UserRepository');
        if (userRepo) {
            const bcrypt = require('bcryptjs');
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
                }
            };
            await ensure('tenant@example.com', 'tenant123', 'tenant', 'Demo Tenant');
            await ensure('landlord@example.com', 'landlord123', 'landlord', 'Demo Landlord');
        }
    }
    catch (err) {
        console.warn('seeding users failed', err.message);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map