"use client";

import { useEffect, useState } from "react";
import {
  BankOutlined,
  CopyOutlined,
  GlobalOutlined,
  KeyOutlined,
  LinkOutlined,
  PartitionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { authApi } from "@/features/auth/auth.api";
import { useAuthStore } from "@/features/auth/auth.store";
import { Organization } from "@/features/auth/auth.types";
import { organizationsApi } from "@/features/organizations/organizations.api";
import { getApiErrorMessage } from "@/lib/api/error";
import { getRoleLabel, getStatusLabel } from "@/lib/constants/vi-labels";

type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : "-";

export default function SettingsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<ChangePasswordValues>();
  const { user, logout } = useAuthStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [publicLeadUrl] = useState(() =>
    typeof window === "undefined"
      ? "/dang-ky-tu-van"
      : `${window.location.origin}/dang-ky-tu-van`,
  );

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        setOrg(await organizationsApi.getMe());
      } catch {
        message.error("Không thể tải thông tin cài đặt");
      } finally {
        setLoading(false);
      }
    };

    void fetchOrg();
  }, [message]);

  const handleCopyLeadFormUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicLeadUrl);
      message.success("Đã sao chép đường dẫn form đăng ký tư vấn");
    } catch {
      message.error("Không thể sao chép đường dẫn");
    }
  };

  const handleOpenLeadForm = () => {
    window.open(publicLeadUrl, "_blank", "noopener,noreferrer");
  };

  const handleChangePassword = async (values: ChangePasswordValues) => {
    try {
      setChangingPassword(true);
      const res = await authApi.changePassword(values);
      message.success(res.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      form.resetFields();
      logout();
      router.push("/login");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể đổi mật khẩu"));
    } finally {
      setChangingPassword(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        subtitle="Quản lý thông tin tài khoản, tổ chức và các thiết lập sử dụng CRM"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title={
            <Space>
              <BankOutlined />
              <span>Thông tin tổ chức</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Tên tổ chức">
              <span className="font-semibold">{org?.name || "-"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDateTime(org?.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              {formatDateTime(org?.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={
            <Space>
              <UserOutlined />
              <span>Thông tin tài khoản</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Họ tên">{fullName || "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{user?.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Tag color="blue" className="m-0">
                {getRoleLabel(user?.role)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tổ chức">{org?.name || "-"}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={
            <Space>
              <GlobalOutlined />
              <span>Tích hợp Website</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Form đăng ký tư vấn">
              <Typography.Text>{publicLeadUrl}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Nguồn Lead mặc định">Website</Descriptions.Item>
            <Descriptions.Item label="Trạng thái Lead mặc định">
              {getStatusLabel("NEW")}
            </Descriptions.Item>
            <Descriptions.Item label="Người phụ trách Lead từ website">
              Theo quy tắc khu vực hoặc cấu hình hệ thống
            </Descriptions.Item>
          </Descriptions>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={<LinkOutlined />} onClick={handleOpenLeadForm}>
              Mở form đăng ký tư vấn
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopyLeadFormUrl}>
              Sao chép đường dẫn
            </Button>
            <Button
              icon={<PartitionOutlined />}
              onClick={() => router.push("/dashboard/settings/lead-assignment")}
            >
              Quy tắc phân công Lead
            </Button>
          </div>
        </Card>

        <Card
          title={
            <Space>
              <KeyOutlined />
              <span>Đổi mật khẩu</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleChangePassword}
            requiredMark="optional"
          >
            <Form.Item
              name="currentPassword"
              label="Mật khẩu hiện tại"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại." }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới." },
                { min: 8, message: "Mật khẩu mới phải có ít nhất 8 ký tự." },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                  message: "Mật khẩu mới phải có ít nhất một chữ cái và một chữ số.",
                },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu mới"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu mới." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Xác nhận mật khẩu mới không khớp."));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={changingPassword}>
              Đổi mật khẩu
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
