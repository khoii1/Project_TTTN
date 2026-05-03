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
import { LeadService } from '../application/services/lead.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  ChangeLeadStatusDto,
  ConvertLeadDto,
  LeadResponseDto,
} from '../application/dto/lead.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private leadService: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created', type: LeadResponseDto })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: TokenPayload
  ): Promise<LeadResponseDto> {
    return this.leadService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Leads list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string
  ): Promise<PaginatedResponse<LeadResponseDto>> {
    return this.leadService.findAll(user.organizationId, page || 1, limit || 10, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead details', type: LeadResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<LeadResponseDto> {
    return this.leadService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead' })
  @ApiResponse({ status: 200, description: 'Lead updated', type: LeadResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: TokenPayload
  ): Promise<LeadResponseDto> {
    return this.leadService.update(id, user.organizationId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change lead status' })
  @ApiResponse({ status: 200, description: 'Lead status updated', type: LeadResponseDto })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeLeadStatusDto,
    @CurrentUser() user: TokenPayload
  ): Promise<LeadResponseDto> {
    return this.leadService.changeStatus(id, user.organizationId, dto);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert lead to account, contact, and opportunity' })
  @ApiResponse({ status: 200, description: 'Lead converted', type: LeadResponseDto })
  async convert(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: TokenPayload
  ): Promise<LeadResponseDto> {
    return this.leadService.convert(id, user.organizationId, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.leadService.delete(id, user.organizationId);
    return { message: 'Lead deleted successfully' };
  }
}
