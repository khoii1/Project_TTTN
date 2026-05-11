"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Descriptions, Form, Input, Popconfirm, Select, Space, Spin, Tabs, Tag, App } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import type { EntityReferenceType } from "@/components/crm/EntityReferenceDisplay";
import {
  emptyValue,
  formatDate,
  formatDateTime,
  SectionCard,
} from "@/components/crm/RecordSections";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task, TaskPriority, TaskStatus } from "@/features/tasks/tasks.types";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setTask(await tasksApi.getById(id));
    } catch {
      message.error("Không thể tải chi tiết công việc");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchTask, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTask]);

  const handleUpdate = async (
    values: Partial<Task> & { dueDate?: dayjs.Dayjs },
  ) => {
    try {
      setSaving(true);
      const { status, ...updateValues } = values;
      delete updateValues.relatedType;
      delete updateValues.relatedId;
      const payload = {
        ...updateValues,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      };
      await tasksApi.update(id, payload);
      if (status && status !== task?.status) {
        await tasksApi.updateStatus(id, status);
      }
      message.success("Đã cập nhật công việc");
      setIsEditing(false);
      fetchTask();
    } catch {
      message.error("Không thể cập nhật công việc");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await tasksApi.complete(id);
      message.success("Đã đánh dấu hoàn thành");
      fetchTask();
    } catch {
      message.error("Không thể hoàn thành công việc");
    }
  };

  const handleDelete = async () => {
    try {
      await tasksApi.delete(id);
      message.success("Đã xóa công việc");
      router.push("/dashboard/tasks");
    } catch {
      message.error("Không thể xóa công việc");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!task) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.subject}
        subtitle={`${getStatusLabel(task.status)} - ${getPriorityLabel(task.priority)}`}
        showBack
        action={
          <Space wrap>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
            )}
            {!isEditing && (
              <Popconfirm
                title={FEEDBACK_LABELS.deleteConfirm}
                description="Bản ghi sẽ được chuyển vào Thùng rác."
                okText="Xóa"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger>Xóa</Button>
              </Popconfirm>
            )}
            {task.status !== TaskStatus.COMPLETED && (
              <Button type="primary" onClick={handleComplete}>
                Đánh dấu hoàn thành
              </Button>
            )}
          </Space>
        }
      />

      {isEditing ? (
        <Card title="Chỉnh sửa công việc" className="shadow-sm">
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
              label="Tiêu đề"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={3} />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  {Object.values(TaskStatus).map((status) => (
                    <Select.Option key={status} value={status}>
                      {getStatusLabel(status)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="priority" label="Mức độ ưu tiên">
                <Select>
                  {Object.values(TaskPriority).map((priority) => (
                    <Select.Option key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dueDate" label="Hạn hoàn thành">
                <DatePicker className="w-full" />
              </Form.Item>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Bản ghi liên quan được hiển thị trong tab Liên quan vì form này
              chưa hỗ trợ đổi liên kết công việc.
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: "details",
              label: "Chi tiết",
              children: (
                <div className="space-y-4">
                  <SectionCard title="Thông tin chung">
                    <Descriptions.Item label="Tiêu đề">
                      {task.subject}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      <Tag
                        color={
                          task.status === TaskStatus.COMPLETED
                            ? "green"
                            : "blue"
                        }
                      >
                        {getStatusLabel(task.status)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mức độ ưu tiên">
                      {getPriorityLabel(task.priority)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hạn hoàn thành">
                      {formatDate(task.dueDate)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mô tả" span={2}>
                      {emptyValue(task.description)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={task.ownerId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Người được giao">
                      <UserReferenceDisplay userId={task.assignedToId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Người hoàn thành">
                      <UserReferenceDisplay userId={task.completedById} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(task.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(task.updatedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian hoàn thành">
                      {formatDateTime(task.completedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: (
                <SectionCard title="Liên kết công việc">
                  <Descriptions.Item label="Liên quan đến">
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
                </SectionCard>
              ),
            },
            {
              key: "activity",
              label: "Hoạt động",
              children: <ActivityTimeline relatedType="TASK" relatedId={id} />,
            },
          ]}
        />
      )}
    </div>
  );
}
