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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultEntrySchema = exports.VaultEntry = exports.EncryptedData = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const class_validator_1 = require("class-validator");
class EncryptedData {
}
exports.EncryptedData = EncryptedData;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], EncryptedData.prototype, "ciphertext", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], EncryptedData.prototype, "iv", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], EncryptedData.prototype, "salt", void 0);
let VaultEntry = class VaultEntry {
};
exports.VaultEntry = VaultEntry;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], VaultEntry.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VaultEntry.prototype, "domain", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VaultEntry.prototype, "username", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", EncryptedData)
], VaultEntry.prototype, "encryptedPassword", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VaultEntry.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VaultEntry.prototype, "favicon", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], VaultEntry.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], VaultEntry.prototype, "updatedAt", void 0);
exports.VaultEntry = VaultEntry = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VaultEntry);
exports.VaultEntrySchema = mongoose_1.SchemaFactory.createForClass(VaultEntry);
exports.VaultEntrySchema.index({ userId: 1, domain: 1 });
//# sourceMappingURL=vault-entry.schema.js.map