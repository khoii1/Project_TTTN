"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
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
      message.success("Login successful");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error(error);
      message.error(getApiErrorMessage(error, "Failed to login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg p-6">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">
            CRM Login
          </Title>
          <p className="text-gray-500">Sign in to your account</p>
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
              { required: true, message: "Please input your Email!" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Email"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Log in
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-500">
              Register now!
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
