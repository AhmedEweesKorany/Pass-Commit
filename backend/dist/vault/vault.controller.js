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
exports.VaultController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const vault_service_1 = require("./vault.service");
let VaultController = class VaultController {
    constructor(vaultService) {
        this.vaultService = vaultService;
    }
    async create(req, createDto) {
        return this.vaultService.create(req.user._id.toString(), createDto);
    }
    async findAll(req) {
        return this.vaultService.findAllByUser(req.user?._id.toString()) || [];
    }
    async findByDomain(req, domain) {
        return this.vaultService.findByDomain(domain, req.user._id.toString());
    }
    async findOne(req, id) {
        return this.vaultService.findById(id, req.user._id.toString());
    }
    async update(req, id, updateDto) {
        return this.vaultService.update(id, req.user._id.toString(), updateDto);
    }
    async delete(req, id) {
        await this.vaultService.delete(id, req.user._id.toString());
    }
    async bulkCreate(req, entries) {
        return this.vaultService.bulkCreate(req.user._id.toString(), entries);
    }
    async deleteAll(req) {
        await this.vaultService.deleteAllByUser(req.user._id.toString());
    }
};
exports.VaultController = VaultController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, vault_service_1.CreateVaultEntryDto]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "findByDomain", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, vault_service_1.UpdateVaultEntryDto]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('bulk'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VaultController.prototype, "deleteAll", null);
exports.VaultController = VaultController = __decorate([
    (0, common_1.Controller)('vault'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [vault_service_1.VaultService])
], VaultController);
//# sourceMappingURL=vault.controller.js.map