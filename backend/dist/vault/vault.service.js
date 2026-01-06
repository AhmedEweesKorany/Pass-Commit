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
exports.VaultService = exports.UpdateVaultEntryDto = exports.CreateVaultEntryDto = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const vault_entry_schema_1 = require("./vault-entry.schema");
class CreateVaultEntryDto {
}
exports.CreateVaultEntryDto = CreateVaultEntryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVaultEntryDto.prototype, "domain", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVaultEntryDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => vault_entry_schema_1.EncryptedData),
    __metadata("design:type", vault_entry_schema_1.EncryptedData)
], CreateVaultEntryDto.prototype, "encryptedPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateVaultEntryDto.prototype, "notes", void 0);
class UpdateVaultEntryDto {
}
exports.UpdateVaultEntryDto = UpdateVaultEntryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVaultEntryDto.prototype, "domain", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVaultEntryDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => vault_entry_schema_1.EncryptedData),
    __metadata("design:type", vault_entry_schema_1.EncryptedData)
], UpdateVaultEntryDto.prototype, "encryptedPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateVaultEntryDto.prototype, "notes", void 0);
let VaultService = class VaultService {
    constructor(vaultEntryModel) {
        this.vaultEntryModel = vaultEntryModel;
    }
    async create(userId, createDto) {
        console.log(`Creating vault entry for user ${userId} and domain ${createDto.domain}`);
        const entry = new this.vaultEntryModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            ...createDto,
        });
        const savedEntry = await entry.save();
        console.log('Vault entry saved with ID:', savedEntry._id);
        return savedEntry;
    }
    async findAllByUser(userId) {
        return this.vaultEntryModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .sort({ updatedAt: -1 })
            .exec();
    }
    async findById(id, userId) {
        return this.vaultEntryModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        })
            .exec();
    }
    async findByDomain(domain, userId) {
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
        return this.vaultEntryModel
            .find({
            userId: new mongoose_2.Types.ObjectId(userId),
            domain: { $regex: normalizedDomain, $options: 'i' },
        })
            .exec();
    }
    async update(id, userId, updateDto) {
        console.log(`Updating vault entry ${id} for user ${userId}`);
        return this.vaultEntryModel
            .findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        }, { ...updateDto, updatedAt: new Date() }, { new: true })
            .exec();
    }
    async delete(id, userId) {
        const result = await this.vaultEntryModel
            .deleteOne({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        })
            .exec();
        return result.deletedCount > 0;
    }
    async deleteAllByUser(userId) {
        const result = await this.vaultEntryModel
            .deleteMany({ userId: new mongoose_2.Types.ObjectId(userId) })
            .exec();
        return result.deletedCount;
    }
    async bulkCreate(userId, entries) {
        const documents = entries.map((entry) => ({
            userId: new mongoose_2.Types.ObjectId(userId),
            ...entry,
        }));
        return this.vaultEntryModel.insertMany(documents);
    }
};
exports.VaultService = VaultService;
exports.VaultService = VaultService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(vault_entry_schema_1.VaultEntry.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], VaultService);
//# sourceMappingURL=vault.service.js.map