"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Select, App } from "antd";
import { useRouter } from "next/navigation";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead, LeadStatus } from "@/features/leads/leads.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";
import { getStatusLabel } from "@/lib/constants/vi-labels";

export default function NewLeadPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Partial<Lead>) => {
    try {
      setLoading(true);
      const { status, ...createPayload } = values;
      const createdLead = await leadsApi.create(createPayload);

      if (status && status !== LeadStatus.NEW) {
        await leadsApi.updateStatus(createdLead.id, status);
      }

      message.success("Tạo khách hàng tiềm năng thành công");
      router.push("/dashboard/leads");
    } catch (error: unknown) {
      message.error(
        getApiErrorMessage(error, "Không thể tạo khách hàng tiềm năng"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tạo khách hàng tiềm năng" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: LeadStatus.NEW }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="firstName"
              label="Tên"
              rules={[{ required: true }]}
            >
              <Input placeholder="John" />
            </Form.Item>
            <Form.Item name="lastName" label="Họ" rules={[{ required: true }]}>
              <Input placeholder="Doe" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="company" label="Công ty">
              <Input placeholder="Acme Inc" />
            </Form.Item>
          </div>

          <Form.Item name="status" label="Trạng thái">
            <Select>
              {Object.values(LeadStatus).map((status) => (
                <Select.Option key={status} value={status}>
                  {getStatusLabel(status)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <SourceFields />

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu khách hàng tiềm năng
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
