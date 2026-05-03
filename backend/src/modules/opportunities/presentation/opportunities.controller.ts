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
    return this.opportunityService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all opportunities with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'stage', required: false, type: String })
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
    @Query('stage') stage?: string
  ): Promise<PaginatedResponse<OpportunityResponseDto>> {
    return this.opportunityService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      stage
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity details', type: OpportunityResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated', type: OpportunityResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.update(id, user.organizationId, dto);
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
    return this.opportunityService.changeStage(id, user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.opportunityService.delete(id, user.organizationId);
    return { message: 'Opportunity deleted successfully' };
  }
}
