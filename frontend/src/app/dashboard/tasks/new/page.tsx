"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Select, DatePicker, App } from "antd";
import { useRouter } from "next/navigation";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task, TaskPriority } from "@/features/tasks/tasks.types";
import { PageHeader } from "@/components/common/PageHeader";
import dayjs from "dayjs";
import { getApiErrorMessage } from "@/lib/api/error";
import { useAuthStore } from "@/features/auth/auth.store";
import { RelatedRecordLookup } from "@/components/crm/RelatedRecordLookup";
import { getPriorityLabel } from "@/lib/constants/vi-labels";

type NewTaskFormValues = Partial<Task> & { dueDate?: dayjs.Dayjs };

export default function NewTaskPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const relatedType = Form.useWatch("relatedType", form);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: NewTaskFormValues) => {
    try {
      if (!user?.id) {
        message.error("Không thể tạo công việc khi chưa xác định người dùng");
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
      message.success("Tạo công việc thành công");
      router.push("/dashboard/tasks");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tạo công việc"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tạo công việc" showBack />
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
            label="Tiêu đề công việc"
            rules={[{ required: true }]}
          >
            <Input placeholder="Gọi chăm sóc khách hàng" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              rows={3}
              placeholder="Gọi khách hàng để trao đổi về đề xuất..."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="dueDate" label="Hạn hoàn thành">
              <DatePicker className="w-full" />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="relatedType" label="Liên quan đến (loại)">
              <Select allowClear>
                <Select.Option value="LEAD">Khách hàng tiềm năng</Select.Option>
                <Select.Option value="ACCOUNT">
                  Khách hàng / Công ty
                </Select.Option>
                <Select.Option value="CONTACT">Người liên hệ</Select.Option>
                <Select.Option value="OPPORTUNITY">
                  Cơ hội bán hàng
                </Select.Option>
                <Select.Option value="CASE">Yêu cầu hỗ trợ</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="relatedId" label="Bản ghi liên quan">
              <RelatedRecordLookup relatedType={relatedType} />
            </Form.Item>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu công việc
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
