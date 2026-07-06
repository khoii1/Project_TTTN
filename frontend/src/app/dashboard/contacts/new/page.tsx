"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Select, App } from "antd";
import { useRouter } from "next/navigation";
import { contactsApi } from "@/features/contacts/contacts.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { Account } from "@/features/accounts/accounts.types";
import { FormPageLayout } from "@/components/common/FormPageLayout";
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
    <FormPageLayout title="Tạo người liên hệ">
        <Form layout="vertical" onFinish={onFinish}>
          <div className="crm-form-grid">
            <Form.Item
              name="firstName"
              label="Họ"
              rules={[{ required: true }]}
            >
              <Input placeholder="Trần Quốc" />
            </Form.Item>
            <Form.Item name="lastName" label="Tên" rules={[{ required: true }]}>
              <Input placeholder="Huy" />
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

          <div className="crm-form-grid">
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="title" label="Chức danh">
              <Input placeholder="Kỹ sư phần mềm" />
            </Form.Item>
          </div>

          <SourceFields />

          <div className="crm-form-actions">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu người liên hệ
            </Button>
          </div>
        </Form>
    </FormPageLayout>
  );
}
