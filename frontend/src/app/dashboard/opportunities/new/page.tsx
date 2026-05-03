'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Select, InputNumber, DatePicker } from 'antd';
import { useRouter } from 'next/navigation';
import { opportunitiesApi } from '@/features/opportunities/opportunities.api';
import { accountsApi } from '@/features/accounts/accounts.api';
import { contactsApi } from '@/features/contacts/contacts.api';
import { OpportunityStage } from '@/features/opportunities/opportunities.types';
import { PageHeader } from '@/components/common/PageHeader';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(console.error);
    contactsApi.getAll().then(setContacts).catch(console.error);
  }, []);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await opportunitiesApi.create({ ...values, stage: values.stage || OpportunityStage.QUALIFY });
      message.success('Opportunity created successfully');
      router.push('/dashboard/opportunities');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Opportunity" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish} initialValues={{ stage: OpportunityStage.QUALIFY }}>
          <Form.Item name="name" label="Opportunity Name" rules={[{ required: true }]}>
            <Input placeholder="100 Laptops deal" />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="amount" label="Amount ($)">
              <InputNumber className="w-full" placeholder="10000" />
            </Form.Item>
            <Form.Item name="closeDate" label="Expected Close Date">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="accountId" label="Account" rules={[{ required: true }]}>
              <Select placeholder="Select an Account" showSearch optionFilterProp="children">
                {accounts.map(acc => (
                  <Select.Option key={acc.id} value={acc.id}>{acc.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="contactId" label="Contact (Optional)">
              <Select placeholder="Select a Contact" showSearch optionFilterProp="children" allowClear>
                {contacts.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.firstName} {c.lastName}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item name="stage" label="Stage">
            <Select>
              {Object.values(OpportunityStage).map(stage => (
                <Select.Option key={stage} value={stage}>{stage}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save Opportunity</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
