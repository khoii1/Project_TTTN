'use client';

import { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message, Button, Form, Input, Select } from 'antd';
import { PageHeader } from '@/components/common/PageHeader';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { contactsApi } from '@/features/contacts/contacts.api';
import { accountsApi } from '@/features/accounts/accounts.api';
import { Contact } from '@/features/contacts/contacts.types';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [contact, setContact] = useState<Contact | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const data = await contactsApi.getById(id);
      setContact(data);
      form.setFieldsValue(data);
    } catch (error) {
      message.error('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
    accountsApi.getAll().then(setAccounts).catch(console.error);
  }, [id]);

  const handleUpdate = async (values: any) => {
    try {
      setSaving(true);
      await contactsApi.update(id, values);
      message.success('Contact updated');
      setIsEditing(false);
      fetchContact();
    } catch (error) {
      message.error('Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>;
  if (!contact) return <div>Contact not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`${contact.firstName} ${contact.lastName}`} 
        subtitle={contact.title}
        showBack
        action={
          !isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>
        }
      />

      <Card className="shadow-sm">
        {isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
              <Form.Item name="phone" label="Phone"><Input /></Form.Item>
              <Form.Item name="title" label="Title"><Input /></Form.Item>
              <Form.Item name="accountId" label="Account" rules={[{ required: true }]}>
                <Select placeholder="Select an Account" showSearch optionFilterProp="children">
                  {accounts.map(acc => (
                    <Select.Option key={acc.id} value={acc.id}>{acc.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="First Name">{contact.firstName}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{contact.lastName}</Descriptions.Item>
            <Descriptions.Item label="Title">{contact.title || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Email">{contact.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{contact.phone || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Account">
               {accounts.find(a => a.id === contact.accountId)?.name || 'Unknown Account'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">{new Date(contact.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Updated">{new Date(contact.updatedAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <ActivityTimeline relatedType="CONTACT" relatedId={id} />
    </div>
  );
}
