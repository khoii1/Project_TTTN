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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpportunityService } from '../application/services/opportunity.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ChangeOpportunityStageDto,
  OpportunityResponseDto,
} from '../application/dto/opportunity.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';
import { ImportCsvResult } from '../../../common/import-csv/import-csv.types';
import { assertCsvFile, CSV_MAX_FILE_SIZE_BYTES } from '../../../common/import-csv/import-csv.utils';

@ApiTags('Opportunities')
@Controller('opportunities')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class OpportunitiesController {
  constructor(private opportunityService: OpportunityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created', type: OpportunityResponseDto })
  async create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.create(user.organizationId, user.sub, dto, user);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_FILE_SIZE_BYTES } }))
  @ApiOperation({ summary: 'Import opportunities from CSV' })
  async importCsv(
    @UploadedFile() file: any,
    @CurrentUser() user: TokenPayload
  ): Promise<ImportCsvResult> {
    const buffer = assertCsvFile(file);
    return this.opportunityService.importCsv(user.organizationId, user.sub, buffer);
  }

  @Get()
  @ApiOperation({ summary: 'Get all opportunities with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'stage', required: false, type: String })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'contactId', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Opportunities list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('accountId') accountId?: string,
    @Query('contactId') contactId?: string,
    @Query('source') source?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<OpportunityResponseDto>> {
    return this.opportunityService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      stage,
      source,
      deleted === 'true',
      accountId,
      contactId,
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity details', type: OpportunityResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.findById(id, user.organizationId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated', type: OpportunityResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.update(id, user.organizationId, dto, user);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Change opportunity stage' })
  @ApiResponse({
    status: 200,
    description: 'Opportunity stage updated',
    type: OpportunityResponseDto,
  })
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeOpportunityStageDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.changeStage(id, user.organizationId, user.sub, dto, user);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity restored', type: OpportunityResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.restore(id, user.organizationId, user.sub, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.opportunityService.delete(id, user.organizationId, user.sub, user);
    return { message: 'Opportunity deleted successfully' };
  }
}
