import { Injectable } from '@nestjs/common';
import { CasePriority, CaseStatus, LeadStatus, OpportunityStage, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  CasesByPriorityDto,
  DashboardSummaryDto,
  DashboardTaskDto,
  LeadsByStatusDto,
  OpportunitiesByStageDto,
} from '../dto/dashboard.dto';

const openOpportunityStages = [
  OpportunityStage.QUALIFY,
  OpportunityStage.PROPOSE,
  OpportunityStage.NEGOTIATE,
];

const openTaskStatuses: TaskStatus[] = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS];
const openCaseStatuses: CaseStatus[] = [CaseStatus.NEW, CaseStatus.WORKING];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(organizationId: string): Promise<DashboardSummaryDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      totalAccounts,
      totalContacts,
      totalOpportunities,
      openOpportunities,
      closedWon,
      openTasks,
      overdueTasks,
      openCases,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.account.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.contact.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.opportunity.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.opportunity.aggregate({
        where: {
          organizationId,
          deletedAt: null,
          stage: { in: openOpportunityStages },
        },
        _sum: { amount: true },
      }),
      this.prisma.opportunity.aggregate({
        where: {
          organizationId,
          deletedAt: null,
          stage: OpportunityStage.CLOSED_WON,
        },
        _sum: { amount: true },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: openTaskStatuses },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: openTaskStatuses },
          dueDate: { lt: today },
        },
      }),
      this.prisma.case.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: openCaseStatuses },
        },
      }),
    ]);

    return {
      totalLeads,
      totalAccounts,
      totalContacts,
      totalOpportunities,
      openOpportunitiesValue: this.decimalToNumber(openOpportunities._sum.amount),
      closedWonValue: this.decimalToNumber(closedWon._sum.amount),
      openTasks,
      overdueTasks,
      openCases,
    };
  }

  async getLeadsByStatus(organizationId: string): Promise<LeadsByStatusDto[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });

    return Object.values(LeadStatus).map((status) => ({
      status,
      count: groups.find((group) => group.status === status)?._count._all ?? 0,
    }));
  }

  async getOpportunitiesByStage(organizationId: string): Promise<OpportunitiesByStageDto[]> {
    const groups = await this.prisma.opportunity.groupBy({
      by: ['stage'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return Object.values(OpportunityStage).map((stage) => {
      const group = groups.find((item) => item.stage === stage);
      return {
        stage,
        count: group?._count._all ?? 0,
        amount: this.decimalToNumber(group?._sum.amount),
      };
    });
  }

  async getCasesByPriority(organizationId: string): Promise<CasesByPriorityDto[]> {
    const groups = await this.prisma.case.groupBy({
      by: ['priority'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });

    return Object.values(CasePriority).map((priority) => ({
      priority,
      count: groups.find((group) => group.priority === priority)?._count._all ?? 0,
    }));
  }

  async getUpcomingTasks(organizationId: string, limit: number = 5): Promise<DashboardTaskDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: openTaskStatuses },
        dueDate: { gte: today },
      },
      orderBy: { dueDate: 'asc' },
      take: Math.min(Math.max(limit, 1), 20),
    });

    return tasks.map((task) => ({
      id: task.id,
      subject: task.subject,
      dueDate: task.dueDate ?? undefined,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt,
    }));
  }

  private decimalToNumber(value: unknown): number {
    if (!value) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'object' && 'toString' in value) {
      return Number(value.toString());
    }

    return Number(value) || 0;
  }
}
