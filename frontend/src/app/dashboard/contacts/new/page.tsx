"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Card, Select, App } from "antd";
import { useRouter } from "next/navigation";
import { contactsApi } from "@/features/contacts/contacts.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { Account } from "@/features/accounts/accounts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";

export default function NewContactPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(console.error);
  }, []);

  const onFinish = async (values: Partial<Contact>) => {
    try {
      setLoading(true);
      await contactsApi.create(values);
      message.success("Tạo người liên hệ thành công");
      router.push("/dashboard/contacts");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tạo người liên hệ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tạo người liên hệ" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish}>
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
            name="accountId"
            label="Khách hàng / Công ty"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Chọn khách hàng / công ty"
              showSearch
              optionFilterProp="children"
            >
              {accounts.map((acc) => (
                <Select.Option key={acc.id} value={acc.id}>
                  {acc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
            <Form.Item name="title" label="Chức danh">
              <Input placeholder="Kỹ sư phần mềm" />
            </Form.Item>
          </div>

          <SourceFields />

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu người liên hệ
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
