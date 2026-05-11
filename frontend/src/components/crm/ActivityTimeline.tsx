"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Timeline, Button, Modal, Form, Input, Tag, Select, DatePicker, App } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { notesApi } from "@/features/notes/notes.api";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Note } from "@/features/notes/notes.types";
import { Task, TaskPriority } from "@/features/tasks/tasks.types";
import { useAuthStore } from "@/features/auth/auth.store";
import type { Dayjs } from "dayjs";
import { RelatedRecordLookup } from "./RelatedRecordLookup";
import {
  EMPTY_STATE_LABELS,
  FIELD_LABELS,
  getPriorityLabel,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";

interface ActivityTimelineProps {
  relatedType: string;
  relatedId: string;
}

type TimelineItem = {
  type: "note" | "task";
  id: string;
  title: string;
  description?: string;
  date: string;
  status?: string;
  author?: string;
  raw: Note | Task;
};

type NewNotePayload = {
  content: string;
};

type NewTaskPayload = {
  subject: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Dayjs;
};

export const ActivityTimeline = ({
  relatedType,
  relatedId,
}: ActivityTimelineProps) => {
  const { message } = App.useApp();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [noteForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const { user } = useAuthStore();

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      // Wait for both notes and tasks, but catch errors independently just in case backend filters fail
      let fetchedNotes: Note[] = [];
      let fetchedTasks: Task[] = [];

      try {
        fetchedNotes = await notesApi.getAll({
          relatedType,
          relatedId,
          page: 1,
          limit: 20,
        });
      } catch (e) {
        console.error("Failed fetching notes", e);
      }

      try {
        fetchedTasks = await tasksApi.getAll({
          relatedType,
          relatedId,
          page: 1,
          limit: 20,
        });
      } catch (e) {
        console.error("Failed fetching tasks", e);
      }

      const formattedNotes: TimelineItem[] = fetchedNotes.map((n) => ({
        type: "note",
        id: n.id,
        title: "Đã thêm ghi chú",
        description: n.content,
        date: n.createdAt,
        author: "Người dùng", // Note: ownerId is available but author name requires separate lookup
        raw: n,
      }));

      const formattedTasks: TimelineItem[] = fetchedTasks.map((t) => ({
        type: "task",
        id: t.id,
        title: `Công việc: ${t.subject}`,
        description: t.description,
        date: t.createdAt,
        status: t.status,
        raw: t,
      }));

      const allItems = [...formattedNotes, ...formattedTasks].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setItems(allItems);
    } catch {
      message.error("Không thể tải hoạt động");
    } finally {
      setLoading(false);
    }
  }, [relatedId, relatedType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchActivities();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchActivities]);

  const handleAddNote = async (values: NewNotePayload) => {
    try {
      await notesApi.create({
        content: values.content,
        relatedType,
        relatedId,
      });
      message.success("Đã thêm ghi chú");
      setIsNoteModalOpen(false);
      noteForm.resetFields();
      fetchActivities();
    } catch {
      message.error("Không thể thêm ghi chú");
    }
  };

  const handleAddTask = async (values: NewTaskPayload) => {
    try {
      if (!user?.id) {
        message.error("Không thể tạo công việc khi chưa xác định người dùng");
        return;
      }

      await tasksApi.create({
        subject: values.subject,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        relatedType,
        relatedId,
        assignedToId: user.id,
      });
      message.success("Đã tạo công việc");
      setIsTaskModalOpen(false);
      taskForm.resetFields();
      fetchActivities();
    } catch {
      message.error("Không thể thêm công việc");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesApi.delete(id);
      message.success("Đã xóa ghi chú");
      fetchActivities();
    } catch {
      message.error("Không thể xóa ghi chú");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold m-0">
          {SECTION_LABELS.activityTimeline}
        </h3>
        <div className="space-x-2">
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setIsNoteModalOpen(true)}
          >
            Thêm ghi chú
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={() => setIsTaskModalOpen(true)}
          >
            Thêm công việc
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-4">{EMPTY_STATE_LABELS.loading}</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 p-4">
          Chưa có hoạt động nào.
        </div>
      ) : (
        <Timeline
          items={items.map((item) => ({
            color:
              item.type === "note"
                ? "blue"
                : item.status === "COMPLETED"
                  ? "green"
                  : "orange",
            content: (
              <div className="mb-4">
                <div className="flex justify-between">
                  <div className="font-semibold flex items-center space-x-2">
                    <span>{item.title}</span>
                    {item.type === "task" && (
                      <Tag
                        color={item.status === "COMPLETED" ? "green" : "orange"}
                      >
                        {getStatusLabel(item.status)}
                      </Tag>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(item.date).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {item.description}
                </div>
                {item.type === "note" && (
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-400">
                    <span>Bởi {item.author}</span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteNote(item.id)}
                    />
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}

      <Modal
        title="Thêm ghi chú"
        open={isNoteModalOpen}
        onCancel={() => setIsNoteModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={noteForm} onFinish={handleAddNote} layout="vertical">
          <Form.Item
            name="content"
            rules={[
              { required: true, message: "Vui lòng nhập nội dung ghi chú" },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Nhập ghi chú tại đây..." />
          </Form.Item>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit">
              Lưu ghi chú
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Thêm công việc"
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={taskForm} onFinish={handleAddTask} layout="vertical">
          <Form.Item
            name="subject"
            label={FIELD_LABELS.subject}
            rules={[{ required: true }]}
          >
            <Input placeholder="Tiêu đề công việc" />
          </Form.Item>
          <Form.Item name="description" label={FIELD_LABELS.description}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="priority"
            label={FIELD_LABELS.priority}
            initialValue={TaskPriority.NORMAL}
          >
            <Select>
              {Object.values(TaskPriority).map((p) => (
                <Select.Option key={p} value={p}>
                  {getPriorityLabel(p)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dueDate" label={FIELD_LABELS.dueDate}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item label={FIELD_LABELS.relatedRecord}>
            <RelatedRecordLookup
              relatedType={relatedType}
              value={relatedId}
              disabled
            />
          </Form.Item>
          <div className="flex justify-end">
            <Button type="primary" htmlType="submit">
              Lưu công việc
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
