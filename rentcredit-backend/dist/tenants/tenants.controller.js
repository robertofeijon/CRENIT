"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const tenants_service_1 = require("./tenants.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const role_guard_1 = require("../auth/guards/role.guard");
const invoice_request_dto_1 = require("./dto/invoice-request.dto");
let TenantsController = class TenantsController {
    tenantsService;
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    async requestInvoice(req, dto) {
        const result = await this.tenantsService.requestInvoice(req.user.userId, dto.propertyId, dto.amount, dto.notes);
        return result;
    }
    async getTenantsByProperty(propertyId, req) {
        return await this.tenantsService.getTenantsByProperty(propertyId, req.user.userId);
    }
    async getLandlordTenants(req) {
        return await this.tenantsService.getLandlordTenants(req.user.userId);
    }
    async getTenantProfile(tenantId) {
        return await this.tenantsService.getTenantProfile(tenantId);
    }
    async getTenantReliabilityScore(tenantId) {
        return await this.tenantsService.getTenantReliabilityScore(tenantId);
    }
    async getMyProperty(req) {
        return await this.tenantsService.getTenantProperty(req.user.userId);
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Post)('request-invoice'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('tenant'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_request_dto_1.InvoiceRequestDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "requestInvoice", null);
__decorate([
    (0, common_1.Get)('by-property/:propertyId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getTenantsByProperty", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getLandlordTenants", null);
__decorate([
    (0, common_1.Get)('profile/:tenantId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getTenantProfile", null);
__decorate([
    (0, common_1.Get)(':tenantId/reliability'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getTenantReliabilityScore", null);
__decorate([
    (0, common_1.Get)('my-property'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('tenant'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getMyProperty", null);
exports.TenantsController = TenantsController = __decorate([
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map