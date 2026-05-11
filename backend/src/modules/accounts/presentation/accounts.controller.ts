import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AccountService } from '../application/services/account.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountResponseDto,
} from '../application/dto/account.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private accountService: AccountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created', type: AccountResponseDto })
  async create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: TokenPayload
  ): Promise<AccountResponseDto> {
    return this.accountService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Accounts list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<AccountResponseDto>> {
    return this.accountService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      source,
      deleted === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account details', type: AccountResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<AccountResponseDto> {
    return this.accountService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, description: 'Account updated', type: AccountResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: TokenPayload
  ): Promise<AccountResponseDto> {
    return this.accountService.update(id, user.organizationId, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted account' })
  @ApiResponse({ status: 200, description: 'Account restored', type: AccountResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<AccountResponseDto> {
    return this.accountService.restore(id, user.organizationId, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.accountService.delete(id, user.organizationId, user.sub);
    return { message: 'Account deleted successfully' };
  }
}
