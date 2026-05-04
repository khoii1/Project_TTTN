"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Typography, Statistic, Tag } from "antd";
import { leadsApi } from "@/features/leads/leads.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { tasksApi } from "@/features/tasks/tasks.api";
import { casesApi } from "@/features/cases/cases.api";

const { Title } = Typography;

type DashboardItem = {
  createdAt: string;
  dueDate?: string | null;
  status?: string;
  amount?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
  title?: string;
  priority?: string;
  stage?: string;
};

export default function DashboardHomePage() {
  const [stats, setStats] = useState({
    leads: 0,
    accounts: 0,
    contacts: 0,
    opportunities: 0,
    tasks: 0,
    cases: 0,
  });

  const [recentLeads, setRecentLeads] = useState<DashboardItem[]>([]);
  const [recentOpps, setRecentOpps] = useState<DashboardItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<DashboardItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Request paginated data with small limit for dashboard
        const [
          leadsRes,
          accountsRes,
          contactsRes,
          oppsRes,
          tasksRes,
          casesRes,
        ] = await Promise.all([
          leadsApi.getAll({ page: 1, limit: 5 }),
          accountsApi.getAll({ page: 1, limit: 5 }),
          contactsApi.getAll({ page: 1, limit: 5 }),
          opportunitiesApi.getAll({ page: 1, limit: 5 }),
          tasksApi.getAll({ page: 1, limit: 5 }),
          casesApi.getAll({ page: 1, limit: 5 }),
        ]);

        // Extract data arrays and get total counts
        const leads = Array.isArray(leadsRes) ? leadsRes : [];
        const accounts = Array.isArray(accountsRes) ? accountsRes : [];
        const contacts = Array.isArray(contactsRes) ? contactsRes : [];
        const opps = Array.isArray(oppsRes) ? oppsRes : [];
        const tasks = Array.isArray(tasksRes) ? tasksRes : [];
        const cases_ = Array.isArray(casesRes) ? casesRes : [];

        setStats({
          leads: leadsRes?.meta?.total || leads.length,
          accounts: accountsRes?.meta?.total || accounts.length,
          contacts: contactsRes?.meta?.total || contacts.length,
          opportunities: oppsRes?.meta?.total || opps.length,
          tasks: tasks.filter((task) => task.status !== "COMPLETED").length,
          cases: cases_.filter(
            (caseItem) =>
              caseItem.status !== "CLOSED" && caseItem.status !== "RESOLVED",
          ).length,
        });

        // Simple sorting for recent items
        const sortDesc = (a: DashboardItem, b: DashboardItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        setRecentLeads(leads.sort(sortDesc).slice(0, 5));
        setRecentOpps(opps.sort(sortDesc).slice(0, 5));

        const pendingTasks = tasks.filter(
          (task) => task.status !== "COMPLETED",
        );
        setUpcomingTasks(
          pendingTasks
            .sort(
              (a: DashboardItem, b: DashboardItem) =>
                new Date(a.dueDate || "").getTime() -
                new Date(b.dueDate || "").getTime(),
            )
            .slice(0, 5),
        );
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <Title level={2} className="!mb-0">
        Dashboard Overview
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Total Leads"
              value={stats.leads}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Total Accounts"
              value={stats.accounts}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Total Contacts"
              value={stats.contacts}
              styles={{ content: { color: "#722ed1" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Total Opportunities"
              value={stats.opportunities}
              styles={{ content: { color: "#fa8c16" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Open Tasks"
              value={stats.tasks}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Open Cases"
              value={stats.cases}
              styles={{ content: { color: "#f5222d" } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="Recent Leads"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-2">
              {recentLeads.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.firstName} {item.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{item.email}</p>
                  </div>
                  <Tag color="blue">{item.status}</Tag>
                </div>
              ))}
              {recentLeads.length === 0 && (
                <p className="text-gray-400 text-sm">No leads</p>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Recent Opportunities"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-2">
              {recentOpps.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">${item.amount || 0}</p>
                  </div>
                  <Tag color="purple">{item.stage}</Tag>
                </div>
              ))}
              {recentOpps.length === 0 && (
                <p className="text-gray-400 text-sm">No opportunities</p>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Upcoming Tasks"
            variant="borderless"
            className="shadow-sm h-full"
          >
            <div className="space-y-2">
              {upcomingTasks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString()
                        : "No date"}
                    </p>
                  </div>
                  <Tag color={item.priority === "HIGH" ? "red" : "default"}>
                    {item.priority}
                  </Tag>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <p className="text-gray-400 text-sm">No upcoming tasks</p>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
