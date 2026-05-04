"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Card, message, Select } from "antd";
import { useRouter } from "next/navigation";
import { contactsApi } from "@/features/contacts/contacts.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { Account } from "@/features/accounts/accounts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";

export default function NewContactPage() {
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
      message.success("Contact created successfully");
      router.push("/dashboard/contacts");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to create contact"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Contact" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="John" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="Doe" />
            </Form.Item>
          </div>

          <Form.Item
            name="accountId"
            label="Account"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Select an Account"
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
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="title" label="Title">
              <Input placeholder="Software Engineer" />
            </Form.Item>
          </div>

          <SourceFields />

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Contact
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
