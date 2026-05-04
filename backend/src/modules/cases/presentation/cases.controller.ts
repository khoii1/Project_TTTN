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
import { CaseService } from '../application/services/case.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  ChangeCaseStatusDto,
  CaseResponseDto,
} from '../application/dto/case.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';

@ApiTags('Cases')
@Controller('cases')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class CasesController {
  constructor(private caseService: CaseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case' })
  @ApiResponse({ status: 201, description: 'Case created', type: CaseResponseDto })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: TokenPayload
  ): Promise<CaseResponseDto> {
    return this.caseService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cases with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Cases list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('source') source?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<CaseResponseDto>> {
    return this.caseService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      status,
      priority,
      source,
      deleted === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by ID' })
  @ApiResponse({ status: 200, description: 'Case details', type: CaseResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<CaseResponseDto> {
    return this.caseService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update case' })
  @ApiResponse({ status: 200, description: 'Case updated', type: CaseResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: TokenPayload
  ): Promise<CaseResponseDto> {
    return this.caseService.update(id, user.organizationId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change case status' })
  @ApiResponse({ status: 200, description: 'Case status updated', type: CaseResponseDto })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeCaseStatusDto,
    @CurrentUser() user: TokenPayload
  ): Promise<CaseResponseDto> {
    return this.caseService.changeStatus(id, user.organizationId, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted case' })
  @ApiResponse({ status: 200, description: 'Case restored', type: CaseResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<CaseResponseDto> {
    return this.caseService.restore(id, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete case' })
  @ApiResponse({ status: 200, description: 'Case deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.caseService.delete(id, user.organizationId);
    return { message: 'Case deleted successfully' };
  }
}
