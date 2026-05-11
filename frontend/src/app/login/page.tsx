"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/auth.api";
import { tokenStorage } from "@/lib/api/token-storage";
import { useAuthStore } from "@/features/auth/auth.store";
import { getApiErrorMessage } from "@/lib/api/error";
import Link from "next/link";

const { Title } = Typography;

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const onFinish = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      const res = await authApi.login(values);
      tokenStorage.setAccessToken(res.tokens.accessToken);
      tokenStorage.setRefreshToken(res.tokens.refreshToken);
      setUser(res.user);
      message.success("Đăng nhập thành công");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error(error);
      message.error(getApiErrorMessage(error, "Không thể đăng nhập"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-auth-page flex h-screen w-screen items-center justify-center">
      <Card className="w-full max-w-md p-6 shadow-lg">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">
            Đăng nhập CRM
          </Title>
          <p className="text-gray-500">Đăng nhập vào tài khoản của bạn</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập Email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Email"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Đăng nhập
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-blue-500">
              Đăng ký ngay
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
