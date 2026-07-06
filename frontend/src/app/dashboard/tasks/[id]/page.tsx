"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Popconfirm, Select, Spin, Tag, App } from "antd";
import { CheckCircleOutlined, EditOutlined, ScheduleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import type { EntityReferenceType } from "@/components/crm/EntityReferenceDisplay";
import { TaskComments } from "@/components/crm/TaskComments";
import {
  RecordInfoCard,
  RecordInfoField,
  EmptyStateCard,
  RecordDetailGrid,
  RecordHeader,
} from "@/components/crm/RecordDetailLayout";
import {
  emptyValue,
  formatDate,
  formatDateTime,
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
      <RecordHeader
        eyebrow="Công việc"
        title={task.subject}
        icon={<ScheduleOutlined />}
        subtitleItems={[
          <>Trạng thái: <strong className="text-gray-800">{getStatusLabel(task.status)}</strong></>,
          <>Hạn xử lý: {formatDate(task.dueDate)}</>,
          <>Người được giao: <UserReferenceDisplay userId={task.assignedToId} /></>,
        ]}
        actions={
          <>
            {!isEditing && (
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                Chỉnh sửa
              </Button>
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
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>
                Đánh dấu hoàn thành
              </Button>
            )}
          </>
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
            <div className="crm-form-grid">
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
            <div className="crm-form-actions">
              <Button onClick={() => setIsEditing(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <RecordDetailGrid
          left={
            <>
                  <RecordInfoCard title="Thông tin chung">
                    <RecordInfoField label="Tiêu đề">
                      {task.subject}
                    </RecordInfoField>
                    <RecordInfoField label="Trạng thái">
                      <Tag
                        color={
                          task.status === TaskStatus.COMPLETED
                            ? "green"
                            : "blue"
                        }
                      >
                        {getStatusLabel(task.status)}
                      </Tag>
                    </RecordInfoField>
                    <RecordInfoField label="Mức độ ưu tiên">
                      {getPriorityLabel(task.priority)}
                    </RecordInfoField>
                    <RecordInfoField label="Hạn hoàn thành">
                      {formatDate(task.dueDate)}
                    </RecordInfoField>
                    <RecordInfoField label="Mô tả">
                      {emptyValue(task.description)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin liên kết">
                    <RecordInfoField label="Liên quan đến">
                      {task.relatedType && task.relatedId ? (
                        <EntityReferenceDisplay
                          entityType={task.relatedType as EntityReferenceType}
                          entityId={task.relatedId}
                          link
                        />
                      ) : (
                        "-"
                      )}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin hệ thống">
                    <RecordInfoField label="Người phụ trách">
                      <UserReferenceDisplay userId={task.ownerId} />
                    </RecordInfoField>
                    <RecordInfoField label="Người được giao">
                      <UserReferenceDisplay userId={task.assignedToId} />
                    </RecordInfoField>
                    <RecordInfoField label="Người hoàn thành">
                      <UserReferenceDisplay userId={task.completedById} />
                    </RecordInfoField>
                    <RecordInfoField label="Ngày tạo">
                      {formatDateTime(task.createdAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Ngày cập nhật">
                      {formatDateTime(task.updatedAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Thời gian hoàn thành">
                      {formatDateTime(task.completedAt)}
                    </RecordInfoField>
                  </RecordInfoCard>
            </>
          }
          middle={<TaskComments taskId={id} />}
          right={
            <>
              <ActivityTimeline relatedType="TASK" relatedId={id} />
              <EmptyStateCard
                title="Tệp đính kèm"
                description="Tệp đính kèm được quản lý trong tab Trao đổi của công việc."
              />
            </>
          }
        />
      )}
    </div>
  );
}



