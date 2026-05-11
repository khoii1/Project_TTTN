"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/auth.api";
import { getApiErrorMessage } from "@/lib/api/error";
import Link from "next/link";

const { Title } = Typography;

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName: string;
};

export default function RegisterPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      await authApi.register(values);
      message.success("Đăng ký thành công. Vui lòng đăng nhập.");
      router.push("/login");
    } catch (error: unknown) {
      console.error(error);
      message.error(getApiErrorMessage(error, "Không thể đăng ký"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-auth-page flex min-h-screen w-screen items-center justify-center py-10">
      <Card className="w-full max-w-md p-6 shadow-lg">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">
            Đăng ký
          </Title>
          <p className="text-gray-500">Tạo tài khoản mới</p>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Tên"
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            rules={[{ required: true, message: "Vui lòng nhập họ" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Họ"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập Email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="Email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item
            name="organizationName"
            rules={[{ required: true, message: "Vui lòng nhập tên tổ chức" }]}
          >
            <Input placeholder="Tên tổ chức" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Đăng ký
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-blue-500">
              Đăng nhập
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
