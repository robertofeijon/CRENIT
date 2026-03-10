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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const payment_dto_1 = require("./dto/payment.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const role_guard_1 = require("../auth/guards/role.guard");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async getPendingInvoices(req) {
        return await this.paymentsService.getPendingInvoicesForLandlord(req.user.userId);
    }
    async approveInvoice(invoiceId, req) {
        return await this.paymentsService.approveInvoiceRequest(invoiceId, req.user.userId);
    }
    async rejectInvoice(invoiceId, req) {
        return await this.paymentsService.rejectInvoiceRequest(invoiceId, req.user.userId);
    }
    async getRentDue(req) {
        return await this.paymentsService.getRentDue(req.user.userId);
    }
    async createPayment(req, createPaymentDto) {
        return await this.paymentsService.createPayment(req.user.userId, createPaymentDto);
    }
    async recordPayment(paymentId, req, recordPaymentDto) {
        return await this.paymentsService.recordPayment(paymentId, req.user.userId, recordPaymentDto);
    }
    async getTenantPayments(req, status) {
        return await this.paymentsService.getTenantPayments(req.user.userId, status);
    }
    async getPropertyPayments(propertyId, req) {
        if (propertyId === 'all') {
            return await this.paymentsService.getAllLandlordPayments(req.user.userId);
        }
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(propertyId)) {
            return { error: 'Invalid propertyId format' };
        }
        return await this.paymentsService.getPropertyPayments(propertyId);
    }
    async getPaymentDetails(paymentId) {
        return await this.paymentsService.getPaymentDetails(paymentId);
    }
    async updatePaymentStatus(paymentId, updatePaymentStatusDto) {
        return await this.paymentsService.updatePaymentStatus(paymentId, updatePaymentStatusDto);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)('pending-invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPendingInvoices", null);
__decorate([
    (0, common_1.Post)('invoice/:invoiceId/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "approveInvoice", null);
__decorate([
    (0, common_1.Post)('invoice/:invoiceId/reject'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "rejectInvoice", null);
__decorate([
    (0, common_1.Get)('rent-due'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('tenant'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getRentDue", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)(':paymentId/record'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('tenant'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, payment_dto_1.RecordPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Get)('tenant'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('tenant'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getTenantPayments", null);
__decorate([
    (0, common_1.Get)('property/:propertyId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPropertyPayments", null);
__decorate([
    (0, common_1.Get)(':paymentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentDetails", null);
__decorate([
    (0, common_1.Put)(':paymentId/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, role_guard_1.Roles)('landlord'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.UpdatePaymentStatusDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "updatePaymentStatus", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map