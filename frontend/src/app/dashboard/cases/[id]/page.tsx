"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Popconfirm, Select, Space, Spin, Steps, Tabs, Tag, App } from "antd";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import {
  emptyValue,
  formatDateTime,
  SectionCard,
} from "@/components/crm/RecordSections";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { casesApi } from "@/features/cases/cases.api";
import { Case, CasePriority, CaseStatus } from "@/features/cases/cases.types";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true);
      setCaseItem(await casesApi.getById(id));
    } catch {
      message.error("Không thể tải chi tiết yêu cầu hỗ trợ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchCase, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCase]);

  const handleUpdate = async (values: Partial<Case>) => {
    try {
      setSaving(true);
      const updatePayload = { ...values };
      delete updatePayload.accountId;
      delete updatePayload.contactId;
      await casesApi.update(id, updatePayload);
      message.success("Đã cập nhật yêu cầu hỗ trợ");
      setIsEditing(false);
      fetchCase();
    } catch {
      message.error("Không thể cập nhật yêu cầu hỗ trợ");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (current: number) => {
    const newStatus = Object.values(CaseStatus)[current];
    try {
      await casesApi.updateStatus(id, newStatus);
      message.success(`Đã cập nhật trạng thái: ${getStatusLabel(newStatus)}`);
      fetchCase();
    } catch {
      message.error("Không thể cập nhật trạng thái");
    }
  };

  const handleDelete = async () => {
    try {
      await casesApi.delete(id);
      message.success("Đã xóa yêu cầu hỗ trợ");
      router.push("/dashboard/cases");
    } catch {
      message.error("Không thể xóa yêu cầu hỗ trợ");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!caseItem) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  const statuses = Object.values(CaseStatus);
  const currentStep = statuses.indexOf(caseItem.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={caseItem.subject}
        subtitle={`${getStatusLabel(caseItem.status)} - ${getPriorityLabel(caseItem.priority)}`}
        showBack
        action={
          <Space wrap>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
            )}
            {!isEditing && (
              <Popconfirm
                title={FEEDBACK_LABELS.deleteConfirm}
                description="Bản ghi sẽ được chuyển vào Thùng rác."
                okText="Xóa"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger>Xóa</Button>
              </Popconfirm>
            )}
          </Space>
        }
      />

      <Card className="shadow-sm">
        <Steps
          current={currentStep}
          onChange={handleStatusChange}
          className="overflow-x-auto"
          items={statuses.map((status) => ({ title: getStatusLabel(status) }))}
        />
      </Card>

      {isEditing ? (
        <Card title="Chỉnh sửa yêu cầu hỗ trợ" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={caseItem}
            onFinish={handleUpdate}
          >
            <Form.Item
              name="subject"
              label="Tiêu đề"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={4} />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="priority" label="Mức độ ưu tiên">
                <Select>
                  {Object.values(CasePriority).map((priority) => (
                    <Select.Option key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <SourceFields />
            <div className="mt-3 text-sm text-gray-500">
              Khách hàng / công ty và người liên hệ được hiển thị trong tab Liên
              quan vì form này chưa hỗ trợ đổi các liên kết đó.
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        </Card>
      ) : (
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: "details",
              label: "Chi tiết",
              children: (
                <div className="space-y-4">
                  <SectionCard title="Thông tin chung">
                    <Descriptions.Item label="Tiêu đề" span={2}>
                      {caseItem.subject}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      <Tag color="blue">{getStatusLabel(caseItem.status)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mức độ ưu tiên">
                      {getPriorityLabel(caseItem.priority)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mô tả" span={2}>
                      {emptyValue(caseItem.description)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin nguồn">
                    <Descriptions.Item label="Nguồn">
                      {getSourceLabel(caseItem.source)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi tiết nguồn">
                      {emptyValue(caseItem.sourceDetail)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={caseItem.ownerId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Người đóng yêu cầu">
                      <UserReferenceDisplay userId={caseItem.closedById} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian đóng">
                      {formatDateTime(caseItem.closedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(caseItem.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(caseItem.updatedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: (
                <SectionCard title="Liên kết yêu cầu hỗ trợ">
                  <Descriptions.Item label="Khách hàng / Công ty">
                    <EntityReferenceDisplay
                      entityType="ACCOUNT"
                      entityId={caseItem.accountId}
                      link
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Người liên hệ">
                    <EntityReferenceDisplay
                      entityType="CONTACT"
                      entityId={caseItem.contactId}
                      link
                    />
                  </Descriptions.Item>
                </SectionCard>
              ),
            },
            {
              key: "activity",
              label: "Hoạt động",
              children: <ActivityTimeline relatedType="CASE" relatedId={id} />,
            },
          ]}
        />
      )}
    </div>
  );
}
