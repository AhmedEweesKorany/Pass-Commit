import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { VaultEntry, VaultEntrySchema } from './vault-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VaultEntry.name, schema: VaultEntrySchema },
    ]),
  ],
  controllers: [VaultController],
  providers: [VaultService],
  exports: [VaultService],
})
export class VaultModule {}
