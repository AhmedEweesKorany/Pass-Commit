import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultEntry, VaultEntrySchema } from './vault-entry.schema';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';


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
