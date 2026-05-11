"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { dashboardApi } from "@/features/dashboard/dashboard.api";
import {
  CasesByPriorityItem,
  DashboardSummary,
  DashboardTask,
  LeadsByStatusItem,
  OpportunitiesByStageItem,
} from "@/features/dashboard/dashboard.types";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead } from "@/features/leads/leads.types";
import { getDataArray } from "@/lib/api/pagination";
import {
  EMPTY_STATE_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";
import { formatVndAmount } from "@/lib/utils/currency";

const { Title } = Typography;

const emptySummary: DashboardSummary = {
  totalLeads: 0,
  totalAccounts: 0,
  totalContacts: 0,
  totalOpportunities: 0,
  openOpportunitiesValue: 0,
  closedWonValue: 0,
  openTasks: 0,
  overdueTasks: 0,
  openCases: 0,
};

const statusColors: Record<string, string> = {
  NEW: "blue",
  CONTACTED: "cyan",
  NURTURING: "purple",
  QUALIFIED: "green",
  UNQUALIFIED: "red",
  CONVERTED: "gold",
};

const stageColors: Record<string, string> = {
  QUALIFY: "blue",
  PROPOSE: "purple",
  NEGOTIATE: "orange",
  CLOSED_WON: "green",
  CLOSED_LOST: "red",
};

const priorityColors: Record<string, string> = {
  LOW: "default",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",
};

const taskPriorityColors: Record<string, string> = {
  LOW: "default",
  NORMAL: "blue",
  HIGH: "red",
};

const getPercent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

export default function DashboardHomePage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [leadsByStatus, setLeadsByStatus] = useState<LeadsByStatusItem[]>([]);
  const [oppsByStage, setOppsByStage] = useState<OpportunitiesByStageItem[]>(
    [],
  );
  const [casesByPriority, setCasesByPriority] = useState<CasesByPriorityItem[]>(
    [],
  );
  const [upcomingTasks, setUpcomingTasks] = useState<DashboardTask[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(false);
        const [
          summaryData,
          leadStatusData,
          opportunityStageData,
          casePriorityData,
          taskData,
          recentLeadData,
        ] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getLeadsByStatus(),
          dashboardApi.getOpportunitiesByStage(),
          dashboardApi.getCasesByPriority(),
          dashboardApi.getUpcomingTasks(5),
          leadsApi.getAll({ page: 1, limit: 5 }),
        ]);

        setSummary(summaryData);
        setLeadsByStatus(leadStatusData);
        setOppsByStage(opportunityStageData);
        setCasesByPriority(casePriorityData);
        setUpcomingTasks(taskData);
        setRecentLeads(getDataArray<Lead>(recentLeadData));
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalLeadStatusCount = useMemo(
    () => leadsByStatus.reduce((sum, item) => sum + item.count, 0),
    [leadsByStatus],
  );

  const totalCasePriorityCount = useMemo(
    () => casesByPriority.reduce((sum, item) => sum + item.count, 0),
    [casesByPriority],
  );

  const upcomingTaskColumns: TableColumnsType<DashboardTask> = [
    {
      title: "Công việc",
      dataIndex: "subject",
      key: "subject",
      render: (subject: string) => (
        <span className="font-medium">{subject}</span>
      ),
    },
    {
      title: "Hạn",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (dueDate?: string) =>
        dueDate ? new Date(dueDate).toLocaleDateString() : "-",
    },
    {
      title: "Mức ưu tiên",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag color={taskPriorityColors[priority]}>
          {getPriorityLabel(priority)}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Title level={2} className="!mb-1">
          Tổng quan
        </Title>
        <p className="text-sm text-gray-500">
          Theo dõi pipeline bán hàng, khối lượng hỗ trợ và công việc cần xử lý.
        </p>
      </div>

      {error && (
        <Alert
          type="warning"
          showIcon
          message="Một số dữ liệu tổng quan chưa tải được."
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Tổng khách hàng tiềm năng"
              value={summary.totalLeads}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Khách hàng / Công ty"
              value={summary.totalAccounts}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Người liên hệ" value={summary.totalContacts} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Cơ hội bán hàng"
              value={summary.totalOpportunities}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Công việc đang mở" value={summary.openTasks} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Yêu cầu hỗ trợ đang mở"
              value={summary.openCases}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Giá trị cơ hội đang mở"
              value={summary.openOpportunitiesValue}
              formatter={(value) => formatVndAmount(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Giá trị chốt thành công"
              value={summary.closedWonValue}
              formatter={(value) => formatVndAmount(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Công việc quá hạn"
              value={summary.overdueTasks}
              styles={{
                content: {
                  color: summary.overdueTasks > 0 ? "#cf1322" : undefined,
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="Khách hàng tiềm năng theo trạng thái"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-3">
              {leadsByStatus.map((item) => (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between">
                    <Tag color={statusColors[item.status]}>
                      {getStatusLabel(item.status)}
                    </Tag>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                  <Progress
                    percent={getPercent(item.count, totalLeadStatusCount)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
              {leadsByStatus.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Cơ hội theo giai đoạn"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-3">
              {oppsByStage.map((item) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0"
                >
                  <div>
                    <Tag color={stageColors[item.stage]}>
                      {getStatusLabel(item.stage)}
                    </Tag>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.count} bản ghi
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatVndAmount(item.amount)}
                  </span>
                </div>
              ))}
              {oppsByStage.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Yêu cầu hỗ trợ theo mức ưu tiên"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-3">
              {casesByPriority.map((item) => (
                <div key={item.priority}>
                  <div className="mb-1 flex items-center justify-between">
                    <Tag color={priorityColors[item.priority]}>
                      {getPriorityLabel(item.priority)}
                    </Tag>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                  <Progress
                    percent={getPercent(item.count, totalCasePriorityCount)}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
              {casesByPriority.length === 0 && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Công việc sắp đến hạn"
            variant="borderless"
            className="shadow-sm"
          >
            <Table
              columns={upcomingTaskColumns}
              dataSource={upcomingTasks}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: EMPTY_STATE_LABELS.noUpcomingTasks }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Khách hàng tiềm năng gần đây"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {[lead.firstName, lead.lastName]
                        .filter(Boolean)
                        .join(" ") || lead.lastName}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {lead.company}
                    </div>
                  </div>
                  <Tag color={statusColors[lead.status]}>
                    {getStatusLabel(lead.status)}
                  </Tag>
                </div>
              ))}
              {recentLeads.length === 0 && (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={EMPTY_STATE_LABELS.noRecentLeads}
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
