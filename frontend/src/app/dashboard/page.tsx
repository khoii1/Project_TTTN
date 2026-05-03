'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Typography, Statistic, List, Tag } from 'antd';
import { leadsApi } from '@/features/leads/leads.api';
import { accountsApi } from '@/features/accounts/accounts.api';
import { contactsApi } from '@/features/contacts/contacts.api';
import { opportunitiesApi } from '@/features/opportunities/opportunities.api';
import { tasksApi } from '@/features/tasks/tasks.api';
import { casesApi } from '@/features/cases/cases.api';

const { Title } = Typography;

export default function DashboardHomePage() {
  const [stats, setStats] = useState({
    leads: 0,
    accounts: 0,
    contacts: 0,
    opportunities: 0,
    tasks: 0,
    cases: 0,
  });
  
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentOpps, setRecentOpps] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [leads, accounts, contacts, opps, tasks, cases] = await Promise.all([
          leadsApi.getAll(),
          accountsApi.getAll(),
          contactsApi.getAll(),
          opportunitiesApi.getAll(),
          tasksApi.getAll(),
          casesApi.getAll()
        ]);

        setStats({
          leads: leads.length,
          accounts: accounts.length,
          contacts: contacts.length,
          opportunities: opps.length,
          tasks: tasks.filter(t => t.status !== 'COMPLETED').length,
          cases: cases.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length,
        });

        // Simple sorting for recent items
        const sortDesc = (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        
        setRecentLeads(leads.sort(sortDesc).slice(0, 5));
        setRecentOpps(opps.sort(sortDesc).slice(0, 5));
        
        const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED');
        setUpcomingTasks(pendingTasks.sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()).slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <Title level={2} className="!mb-0">Dashboard Overview</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Total Leads" value={stats.leads} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Total Accounts" value={stats.accounts} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Total Contacts" value={stats.contacts} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Total Opportunities" value={stats.opportunities} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Open Tasks" value={stats.tasks} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Open Cases" value={stats.cases} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Recent Leads" bordered={false} className="shadow-sm h-full">
            <List
              size="small"
              dataSource={recentLeads}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.firstName} ${item.lastName}`}
                    description={item.email}
                  />
                  <Tag color="blue">{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Opportunities" bordered={false} className="shadow-sm h-full">
            <List
              size="small"
              dataSource={recentOpps}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={`$${item.amount || 0}`}
                  />
                  <Tag color="purple">{item.stage}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Upcoming Tasks" bordered={false} className="shadow-sm h-full">
            <List
              size="small"
              dataSource={upcomingTasks}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No date'}
                  />
                  <Tag color={item.priority === 'HIGH' ? 'red' : 'default'}>{item.priority}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
