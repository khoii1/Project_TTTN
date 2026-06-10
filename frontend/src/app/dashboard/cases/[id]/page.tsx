"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Popconfirm, Select, Spin, Tag, App } from "antd";
import { EditOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import {
  RecordInfoCard,
  RecordInfoField,
  EmptyStateCard,
  RecordDetailGrid,
  RecordHeader,
  StagePath,
} from "@/components/crm/RecordDetailLayout";
import {
  emptyValue,
  formatDateTime,
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
  return (
    <div className="space-y-6">
      <RecordHeader
        eyebrow="Yêu cầu hỗ trợ"
        title={caseItem.subject}
        icon={<CustomerServiceOutlined />}
        subtitleItems={[
          <>Trạng thái: <strong className="text-gray-800">{getStatusLabel(caseItem.status)}</strong></>,
          <>Ưu tiên: {getPriorityLabel(caseItem.priority)}</>,
          <>Người phụ trách: <UserReferenceDisplay userId={caseItem.ownerId} /></>,
        ]}
        actions={
          <>
            {!isEditing && (
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                Chỉnh sửa
              </Button>
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
          </>
        }
      />

      <StagePath
        stages={statuses}
        currentStage={caseItem.status}
        getLabel={getStatusLabel}
        onChange={handleStatusChange}
        testIdPrefix="case-status"
      />

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
        <RecordDetailGrid
          left={
            <>
                  <RecordInfoCard title="Thông tin chung">
                    <RecordInfoField label="Tiêu đề">
                      {caseItem.subject}
                    </RecordInfoField>
                    <RecordInfoField label="Trạng thái">
                      <Tag color="blue">{getStatusLabel(caseItem.status)}</Tag>
                    </RecordInfoField>
                    <RecordInfoField label="Mức độ ưu tiên">
                      {getPriorityLabel(caseItem.priority)}
                    </RecordInfoField>
                    <RecordInfoField label="Mô tả">
                      {emptyValue(caseItem.description)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin nguồn">
                    <RecordInfoField label="Nguồn">
                      {getSourceLabel(caseItem.source)}
                    </RecordInfoField>
                    <RecordInfoField label="Chi tiết nguồn">
                      {emptyValue(caseItem.sourceDetail)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin hệ thống">
                    <RecordInfoField label="Người phụ trách">
                      <UserReferenceDisplay userId={caseItem.ownerId} />
                    </RecordInfoField>
                    <RecordInfoField label="Người đóng yêu cầu">
                      <UserReferenceDisplay userId={caseItem.closedById} />
                    </RecordInfoField>
                    <RecordInfoField label="Thời gian đóng">
                      {formatDateTime(caseItem.closedAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Ngày tạo">
                      {formatDateTime(caseItem.createdAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Ngày cập nhật">
                      {formatDateTime(caseItem.updatedAt)}
                    </RecordInfoField>
                  </RecordInfoCard>
            </>
          }
          middle={<ActivityTimeline relatedType="CASE" relatedId={id} />}
          right={
            <>
                <RecordInfoCard title="Liên kết yêu cầu hỗ trợ">
                  <RecordInfoField label="Khách hàng / Công ty">
                    <EntityReferenceDisplay
                      entityType="ACCOUNT"
                      entityId={caseItem.accountId}
                      link
                    />
                  </RecordInfoField>
                  <RecordInfoField label="Người liên hệ">
                    <EntityReferenceDisplay
                      entityType="CONTACT"
                      entityId={caseItem.contactId}
                      link
                    />
                  </RecordInfoField>
                </RecordInfoCard>
                <EmptyStateCard
                  title="Tệp đính kèm"
                  description="Chưa có khu vực tệp riêng cho yêu cầu hỗ trợ này."
                />
            </>
          }
        />
      )}
    </div>
  );
}



