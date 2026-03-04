"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tenants_service_1 = require("./tenants.service");
const tenants_controller_1 = require("./tenants.controller");
const entities_1 = require("../entities");
const auth_module_1 = require("../auth/auth.module");
let TenantsModule = class TenantsModule {
};
exports.TenantsModule = TenantsModule;
exports.TenantsModule = TenantsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([entities_1.User, entities_1.TenantProfile, entities_1.Property, entities_1.Payment]), auth_module_1.AuthModule],
        providers: [tenants_service_1.TenantsService],
        controllers: [tenants_controller_1.TenantsController],
        exports: [tenants_service_1.TenantsService],
    })
], TenantsModule);
//# sourceMappingURL=tenants.module.js.map