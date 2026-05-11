import { ApiProperty } from '@nestjs/swagger';
import {
  CasePriority,
  LeadStatus,
  OpportunityStage,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

export class DashboardSummaryDto {
  @ApiProperty({ example: 25 })
  totalLeads: number;

  @ApiProperty({ example: 12 })
  totalAccounts: number;

  @ApiProperty({ example: 30 })
  totalContacts: number;

  @ApiProperty({ example: 8 })
  totalOpportunities: number;

  @ApiProperty({ example: 125000 })
  openOpportunitiesValue: number;

  @ApiProperty({ example: 45000 })
  closedWonValue: number;

  @ApiProperty({ example: 14 })
  openTasks: number;

  @ApiProperty({ example: 3 })
  overdueTasks: number;

  @ApiProperty({ example: 5 })
  openCases: number;
}

export class LeadsByStatusDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  status: LeadStatus;

  @ApiProperty({ example: 10 })
  count: number;
}

export class OpportunitiesByStageDto {
  @ApiProperty({ enum: OpportunityStage, example: OpportunityStage.QUALIFY })
  stage: OpportunityStage;

  @ApiProperty({ example: 5 })
  count: number;

  @ApiProperty({ example: 10000 })
  amount: number;
}

export class CasesByPriorityDto {
  @ApiProperty({ enum: CasePriority, example: CasePriority.MEDIUM })
  priority: CasePriority;

  @ApiProperty({ example: 5 })
  count: number;
}

export class DashboardTaskDto {
  @ApiProperty({ example: '77777777-7777-7777-7777-777777777777' })
  id: string;

  @ApiProperty({ example: 'Follow up with Global Solutions' })
  subject: string;

  @ApiProperty({ example: '2026-05-30T00:00:00.000Z', required: false })
  dueDate?: Date;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.NOT_STARTED })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  priority: TaskPriority;

  @ApiProperty({ example: '2026-04-29T08:00:00.000Z' })
  createdAt: Date;
}
