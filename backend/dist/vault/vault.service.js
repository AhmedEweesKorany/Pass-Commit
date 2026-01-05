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
exports.VaultService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vault_entry_schema_1 = require("./vault-entry.schema");
let VaultService = class VaultService {
    constructor(vaultEntryModel) {
        this.vaultEntryModel = vaultEntryModel;
    }
    async create(userId, createDto) {
        const entry = new this.vaultEntryModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            ...createDto,
        });
        return entry.save();
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