"use client";

import { useState } from "react";
import { Form, Input, Button, App } from "antd";
import { useRouter } from "next/navigation";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { FormPageLayout } from "@/components/common/FormPageLayout";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";

export default function NewAccountPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Partial<Account>) => {
    try {
      setLoading(true);
      await accountsApi.create(values);
      message.success("Tạo khách hàng / công ty thành công");
      router.push("/dashboard/accounts");
    } catch (error: unknown) {
      message.error(
        getApiErrorMessage(error, "Không thể tạo khách hàng / công ty"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout title="Tạo khách hàng / công ty">
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Tên khách hàng / công ty"
            rules={[{ required: true }]}
          >
            <Input placeholder="Acme Corporation" />
          </Form.Item>

          <div className="crm-form-grid">
            <Form.Item name="website" label="Website">
              <Input placeholder="www.example.com" />
            </Form.Item>
            <Form.Item name="type" label="Loại">
              <Input placeholder="Doanh nghiệp" />
            </Form.Item>
          </div>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="+1 234 567 8900" />
          </Form.Item>

          <SourceFields />

          <div className="crm-form-actions">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu khách hàng / công ty
            </Button>
          </div>
        </Form>
    </FormPageLayout>
  );
}
