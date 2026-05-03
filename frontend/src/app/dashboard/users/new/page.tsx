'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, message, Select } from 'antd';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/features/users/users.api';
import { UserRole } from '@/features/auth/auth.types';
import { PageHeader } from '@/components/common/PageHeader';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await usersApi.create(values);
      message.success('User created successfully');
      router.push('/dashboard/users');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New User" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish} initialValues={{ role: UserRole.SALES }}>
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

          <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password placeholder="Password" />
          </Form.Item>
          
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select>
              {Object.values(UserRole).map(role => (
                <Select.Option key={role} value={role}>{role}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save User</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
