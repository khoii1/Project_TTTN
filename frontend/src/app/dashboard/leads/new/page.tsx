'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { useRouter } from 'next/navigation';
import { leadsApi } from '@/features/leads/leads.api';
import { LeadStatus } from '@/features/leads/leads.types';
import { PageHeader } from '@/components/common/PageHeader';

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await leadsApi.create({ ...values, status: values.status || LeadStatus.NEW });
      message.success('Lead created successfully');
      router.push('/dashboard/leads');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Lead" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish} initialValues={{ status: LeadStatus.NEW }}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input placeholder="John" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input placeholder="Doe" />
            </Form.Item>
          </div>
          
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="john@example.com" />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="company" label="Company">
              <Input placeholder="Acme Inc" />
            </Form.Item>
          </div>
          
          <Form.Item name="status" label="Status">
            <Select>
              {Object.values(LeadStatus).map(status => (
                <Select.Option key={status} value={status}>{status}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save Lead</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
