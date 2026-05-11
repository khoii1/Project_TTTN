"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Spin, App } from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { organizationsApi } from "@/features/organizations/organizations.api";
import { Organization } from "@/features/auth/auth.types";

export default function OrganizationSettingsPage() {
  const { message } = App.useApp();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        const data = await organizationsApi.getMe();
        setOrg(data);
      } catch {
        message.error("Không thể tải cài đặt tổ chức");
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!org) return <div>Không tìm thấy tổ chức</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt tổ chức" />

      <Card className="shadow-sm max-w-3xl">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="Tên tổ chức">
            <span className="font-semibold text-lg">{org.name}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {new Date(org.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            {new Date(org.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
