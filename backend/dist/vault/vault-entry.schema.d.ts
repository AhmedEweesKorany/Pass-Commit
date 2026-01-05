import { Document, Types } from 'mongoose';
export type VaultEntryDocument = VaultEntry & Document;
export declare class EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
}
export declare class VaultEntry {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    domain: string;
    username: string;
    encryptedPassword: EncryptedData;
    notes?: string;
    favicon?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const VaultEntrySchema: import("mongoose").Schema<VaultEntry, import("mongoose").Model<VaultEntry, any, any, any, Document<unknown, any, VaultEntry, any, {}> & VaultEntry & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VaultEntry, Document<unknown, {}, import("mongoose").FlatRecord<VaultEntry>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<VaultEntry> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
