import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<import("./user.schema").User | null>;
    updateSalt(req: any, salt: string): Promise<import("./user.schema").User | null>;
    getSalt(req: any): Promise<{
        salt: string | undefined;
    }>;
}
