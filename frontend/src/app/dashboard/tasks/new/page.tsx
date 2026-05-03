'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, message, Select, DatePicker } from 'antd';
import { useRouter } from 'next/navigation';
import { tasksApi } from '@/features/tasks/tasks.api';
import { TaskStatus, TaskPriority } from '@/features/tasks/tasks.types';
import { PageHeader } from '@/components/common/PageHeader';

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await tasksApi.create({ 
        ...values, 
        status: values.status || TaskStatus.NOT_STARTED,
        priority: values.priority || TaskPriority.NORMAL,
      });
      message.success('Task created successfully');
      router.push('/dashboard/tasks');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Task" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish} initialValues={{ status: TaskStatus.NOT_STARTED, priority: TaskPriority.NORMAL }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Follow up call" />
          </Form.Item>
          
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Call client regarding the proposal..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="dueDate" label="Due Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select>
                {Object.values(TaskPriority).map(priority => (
                  <Select.Option key={priority} value={priority}>{priority}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="relatedType" label="Related To (Type)">
              <Select allowClear>
                <Select.Option value="LEAD">Lead</Select.Option>
                <Select.Option value="ACCOUNT">Account</Select.Option>
                <Select.Option value="CONTACT">Contact</Select.Option>
                <Select.Option value="OPPORTUNITY">Opportunity</Select.Option>
                <Select.Option value="CASE">Case</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="relatedId" label="Related ID">
              <Input placeholder="Enter ID..." />
            </Form.Item>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save Task</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
