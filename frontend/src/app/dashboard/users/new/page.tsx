"use client";

import { useState } from "react";
import { Form, Input, Button, Select, App } from "antd";
import { useRouter } from "next/navigation";
import { usersApi } from "@/features/users/users.api";
import { User } from "@/features/auth/auth.types";
import { UserRole } from "@/features/auth/auth.types";
import { FormPageLayout } from "@/components/common/FormPageLayout";
import { getApiErrorMessage } from "@/lib/api/error";
import { getRoleLabel } from "@/lib/constants/vi-labels";

type NewUserPayload = Partial<User> & { password: string };

export default function NewUserPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: NewUserPayload) => {
    try {
      setLoading(true);
      await usersApi.create(values);
      message.success("Tạo người dùng thành công");
      router.push("/dashboard/users");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tạo người dùng"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout title="Tạo người dùng" size="compact">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: UserRole.SALES }}
        >
          <div className="crm-form-grid">
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

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true }, { min: 6 }]}
          >
            <Input.Password placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select>
              {Object.values(UserRole).map((role) => (
                <Select.Option key={role} value={role}>
                  {getRoleLabel(role)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="crm-form-actions">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu người dùng
            </Button>
          </div>
        </Form>
    </FormPageLayout>
  );
}
