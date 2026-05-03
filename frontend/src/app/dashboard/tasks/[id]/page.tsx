'use client';

import { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message, Button, Form, Input, Select, DatePicker } from 'antd';
import { PageHeader } from '@/components/common/PageHeader';
import { tasksApi } from '@/features/tasks/tasks.api';
import { Task, TaskStatus, TaskPriority } from '@/features/tasks/tasks.types';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import React from 'react';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getById(id);
      setTask(data);
      form.setFieldsValue({
        ...data,
        dueDate: data.dueDate ? dayjs(data.dueDate) : undefined
      });
    } catch (error) {
      message.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleUpdate = async (values: any) => {
    try {
      setSaving(true);
      const payload = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined
      };
      await tasksApi.update(id, payload);
      message.success('Task updated');
      setIsEditing(false);
      fetchTask();
    } catch (error) {
      message.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await tasksApi.complete(id);
      message.success('Task marked as completed');
      fetchTask();
    } catch (error) {
      message.error('Failed to complete task');
    }
  };

  if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={task.title} 
        showBack
        action={
          <div className="space-x-2">
             {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>}
             {task.status !== 'COMPLETED' && (
               <Button type="primary" onClick={handleComplete}>Mark Complete</Button>
             )}
          </div>
        }
      />

      <Card className="shadow-sm">
        {isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="status" label="Status">
                <Select>
                  {Object.values(TaskStatus).map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="priority" label="Priority">
                <Select>
                  {Object.values(TaskPriority).map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="dueDate" label="Due Date"><DatePicker className="w-full" /></Form.Item>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="Title">{task.title}</Descriptions.Item>
            <Descriptions.Item label="Status">{task.status}</Descriptions.Item>
            <Descriptions.Item label="Priority">{task.priority}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Related Type">{task.relatedType || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Related ID">{task.relatedId || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{task.description || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Created">{new Date(task.createdAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </div>
  );
}
