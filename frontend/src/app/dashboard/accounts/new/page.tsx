"use client";

import { useState } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { useRouter } from "next/navigation";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Partial<Account>) => {
    try {
      setLoading(true);
      await accountsApi.create(values);
      message.success("Account created successfully");
      router.push("/dashboard/accounts");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to create account"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Account" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Account Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Acme Corporation" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="website" label="Website">
              <Input placeholder="www.example.com" />
            </Form.Item>
            <Form.Item name="type" label="Type">
              <Input placeholder="Enterprise" />
            </Form.Item>
          </div>

          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 234 567 8900" />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Account
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
