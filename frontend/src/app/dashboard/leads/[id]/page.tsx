'use client';

import { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message, Button, Steps, Form, Input, Select, Modal } from 'antd';
import { PageHeader } from '@/components/common/PageHeader';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { leadsApi } from '@/features/leads/leads.api';
import { Lead, LeadStatus } from '@/features/leads/leads.types';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const data = await leadsApi.getById(id);
      setLead(data);
      form.setFieldsValue(data);
    } catch (error) {
      message.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const handleUpdate = async (values: any) => {
    try {
      setSaving(true);
      await leadsApi.update(id, values);
      message.success('Lead updated');
      setIsEditing(false);
      fetchLead();
    } catch (error) {
      message.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (current: number) => {
    const statuses = Object.values(LeadStatus);
    const newStatus = statuses[current];
    try {
      await leadsApi.updateStatus(id, newStatus);
      message.success(`Status updated to ${newStatus}`);
      fetchLead();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const handleConvert = async () => {
    try {
      setConverting(true);
      await leadsApi.convert(id);
      message.success('Lead converted successfully!');
      fetchLead();
      // Wait for user to read message, then could redirect to accounts
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>;
  if (!lead) return <div>Lead not found</div>;

  const statuses = Object.values(LeadStatus);
  const currentStep = statuses.indexOf(lead.status);

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`${lead.firstName} ${lead.lastName}`} 
        subtitle={lead.company}
        showBack
        action={
          <div className="space-x-2">
            {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>}
            {lead.status !== 'CONVERTED' && (
              <Button type="primary" className="bg-green-600" loading={converting} onClick={handleConvert}>
                Convert Lead
              </Button>
            )}
          </div>
        }
      />

      <Card className="shadow-sm">
        <Steps 
          current={currentStep} 
          onChange={lead.status !== 'CONVERTED' ? handleStatusChange : undefined}
          className="mb-8 overflow-x-auto"
          items={statuses.map(status => ({ title: status }))}
        />

        {isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
              <Form.Item name="phone" label="Phone"><Input /></Form.Item>
              <Form.Item name="company" label="Company"><Input /></Form.Item>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="First Name">{lead.firstName}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{lead.lastName}</Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{lead.phone || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Company">{lead.company || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Status">{lead.status}</Descriptions.Item>
            <Descriptions.Item label="Created">{new Date(lead.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Updated">{new Date(lead.updatedAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      
      <ActivityTimeline relatedType="LEAD" relatedId={id} />
    </div>
  );
}
