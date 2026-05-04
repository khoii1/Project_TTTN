"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      await authApi.register(values);
      message.success("Registration successful. Please log in.");
      router.push("/login");
    } catch (error: unknown) {
      console.error(error);
      message.error(getApiErrorMessage(error, "Failed to register"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gray-50 py-10">
      <Card className="w-full max-w-md shadow-lg p-6">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">
            Register
          </Title>
          <p className="text-gray-500">Create a new account</p>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: "First name is required" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="First Name"
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            rules={[{ required: true, message: "Last name is required" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Last Name"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
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
              { required: true, message: "Password is required" },
              { min: 6, message: "At least 6 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item
            name="organizationName"
            rules={[
              { required: true, message: "Organization name is required" },
            ]}
          >
            <Input placeholder="Organization Name" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Register
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500">
              Log in
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
