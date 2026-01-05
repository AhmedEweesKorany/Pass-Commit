import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
export interface CreateUserDto {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
}
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    create(createUserDto: CreateUserDto): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    updateSalt(userId: string, salt: string): Promise<User | null>;
}
