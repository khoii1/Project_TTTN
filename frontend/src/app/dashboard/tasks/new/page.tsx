"use client";

import { useState } from "react";
import { Form, Input, Button, Card, message, Select, DatePicker } from "antd";
import { useRouter } from "next/navigation";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task, TaskPriority } from "@/features/tasks/tasks.types";
import { PageHeader } from "@/components/common/PageHeader";
import dayjs from "dayjs";
import { getApiErrorMessage } from "@/lib/api/error";
import { useAuthStore } from "@/features/auth/auth.store";
import { RelatedRecordLookup } from "@/components/crm/RelatedRecordLookup";

type NewTaskFormValues = Partial<Task> & { dueDate?: dayjs.Dayjs };

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const relatedType = Form.useWatch("relatedType", form);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: NewTaskFormValues) => {
    try {
      if (!user?.id) {
        message.error("Cannot create task without a current user");
        return;
      }

      setLoading(true);
      await tasksApi.create({
        subject: values.subject,
        description: values.description,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        priority: values.priority || TaskPriority.NORMAL,
        relatedType: values.relatedType,
        relatedId: values.relatedId,
        assignedToId: user.id,
      });
      message.success("Task created successfully");
      router.push("/dashboard/tasks");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to create task"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Task" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            priority: TaskPriority.NORMAL,
          }}
        >
          <Form.Item
            name="subject"
            label="Task Subject"
            rules={[{ required: true }]}
          >
            <Input placeholder="Follow up call" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={3}
              placeholder="Call client regarding the proposal..."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="dueDate" label="Due Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select>
                {Object.values(TaskPriority).map((priority) => (
                  <Select.Option key={priority} value={priority}>
                    {priority}
                  </Select.Option>
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
            <Form.Item name="relatedId" label="Related Record">
              <RelatedRecordLookup relatedType={relatedType} />
            </Form.Item>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Task
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
