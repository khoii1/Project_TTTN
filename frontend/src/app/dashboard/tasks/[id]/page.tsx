"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Spin,
  message,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task, TaskStatus, TaskPriority } from "@/features/tasks/tasks.types";
import dayjs from "dayjs";
import React from "react";
import { RelatedRecordLookup } from "@/components/crm/RelatedRecordLookup";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import type { EntityReferenceType } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";

const TaskRelationFields = () => {
  const relatedType = Form.useWatch("relatedType");

  return (
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
  );
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getById(id);
      setTask(data);
    } catch {
      message.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTask();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchTask]);

  const handleUpdate = async (
    values: Partial<Task> & { dueDate?: dayjs.Dayjs },
  ) => {
    try {
      setSaving(true);
      const { status, ...updateValues } = values;
      const payload = {
        ...updateValues,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      };
      await tasksApi.update(id, payload);
      if (status && status !== task?.status) {
        await tasksApi.updateStatus(id, status);
      }
      message.success("Task updated");
      setIsEditing(false);
      fetchTask();
    } catch {
      message.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await tasksApi.complete(id);
      message.success("Task marked as completed");
      fetchTask();
    } catch {
      message.error("Failed to complete task");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!task) return <div>Task not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.subject}
        showBack
        action={
          <div className="space-x-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
            {task.status !== "COMPLETED" && (
              <Button type="primary" onClick={handleComplete}>
                Mark Complete
              </Button>
            )}
          </div>
        }
      />

      <Card className="shadow-sm">
        {isEditing ? (
          <Form
            layout="vertical"
            initialValues={{
              ...task,
              dueDate: task.dueDate ? dayjs(task.dueDate) : undefined,
            }}
            onFinish={handleUpdate}
          >
            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="status" label="Status">
                <Select>
                  {Object.values(TaskStatus).map((s) => (
                    <Select.Option key={s} value={s}>
                      {s}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="priority" label="Priority">
                <Select>
                  {Object.values(TaskPriority).map((p) => (
                    <Select.Option key={p} value={p}>
                      {p}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dueDate" label="Due Date">
                <DatePicker className="w-full" />
              </Form.Item>
            </div>
            <TaskRelationFields />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="Subject">
              {task.subject}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{task.status}</Descriptions.Item>
            <Descriptions.Item label="Priority">
              {task.priority}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Related Type">
              {task.relatedType || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Related To">
              {task.relatedType && task.relatedId ? (
                <EntityReferenceDisplay
                  entityType={task.relatedType as EntityReferenceType}
                  entityId={task.relatedId}
                  link
                />
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned To">
              <UserReferenceDisplay userId={task.assignedToId} />
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={task.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {task.description || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(task.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </div>
  );
}
