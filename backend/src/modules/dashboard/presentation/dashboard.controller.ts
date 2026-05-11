import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { DashboardService } from '../application/services/dashboard.service';
import {
  CasesByPriorityDto,
  DashboardSummaryDto,
  DashboardTaskDto,
  LeadsByStatusDto,
  OpportunitiesByStageDto,
} from '../application/dto/dashboard.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get CRM dashboard summary metrics' })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  getSummary(@CurrentUser() user: TokenPayload): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(user.organizationId);
  }

  @Get('leads-by-status')
  @ApiOperation({ summary: 'Get lead counts grouped by status' })
  @ApiResponse({ status: 200, type: [LeadsByStatusDto] })
  getLeadsByStatus(@CurrentUser() user: TokenPayload): Promise<LeadsByStatusDto[]> {
    return this.dashboardService.getLeadsByStatus(user.organizationId);
  }

  @Get('opportunities-by-stage')
  @ApiOperation({ summary: 'Get opportunity counts and amounts grouped by stage' })
  @ApiResponse({ status: 200, type: [OpportunitiesByStageDto] })
  getOpportunitiesByStage(@CurrentUser() user: TokenPayload): Promise<OpportunitiesByStageDto[]> {
    return this.dashboardService.getOpportunitiesByStage(user.organizationId);
  }

  @Get('cases-by-priority')
  @ApiOperation({ summary: 'Get case counts grouped by priority' })
  @ApiResponse({ status: 200, type: [CasesByPriorityDto] })
  getCasesByPriority(@CurrentUser() user: TokenPayload): Promise<CasesByPriorityDto[]> {
    return this.dashboardService.getCasesByPriority(user.organizationId);
  }

  @Get('upcoming-tasks')
  @ApiOperation({ summary: 'Get upcoming open tasks due soon' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [DashboardTaskDto] })
  getUpcomingTasks(
    @CurrentUser() user: TokenPayload,
    @Query('limit') limit?: number
  ): Promise<DashboardTaskDto[]> {
    return this.dashboardService.getUpcomingTasks(user.organizationId, limit || 5);
  }
}
