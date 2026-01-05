import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { VaultService, CreateVaultEntryDto, UpdateVaultEntryDto } from './vault.service';
import { VaultEntry } from './vault-entry.schema';

interface AuthenticatedRequest {
  user: { _id: { toString(): string } };
}

@Controller('vault')
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreateVaultEntryDto,
  ): Promise<VaultEntry> {
    return this.vaultService.create(req.user._id.toString(), createDto);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest): Promise<VaultEntry[]> {
    return this.vaultService.findAllByUser(req.user._id.toString());
  }

  @Get('search')
  async findByDomain(
    @Request() req: AuthenticatedRequest,
    @Query('domain') domain: string,
  ): Promise<VaultEntry[]> {
    return this.vaultService.findByDomain(domain, req.user._id.toString());
  }

  @Get(':id')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<VaultEntry | null> {
    return this.vaultService.findById(id, req.user._id.toString());
  }

  @Put(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateVaultEntryDto,
  ): Promise<VaultEntry | null> {
    return this.vaultService.update(id, req.user._id.toString(), updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.vaultService.delete(id, req.user._id.toString());
  }

  @Post('bulk')
  async bulkCreate(
    @Request() req: AuthenticatedRequest,
    @Body() entries: CreateVaultEntryDto[],
  ): Promise<VaultEntry[]> {
    return this.vaultService.bulkCreate(req.user._id.toString(), entries);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@Request() req: AuthenticatedRequest): Promise<void> {
    await this.vaultService.deleteAllByUser(req.user._id.toString());
  }
}
