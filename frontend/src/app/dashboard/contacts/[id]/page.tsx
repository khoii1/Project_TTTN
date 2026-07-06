"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Popconfirm, Spin, App } from "antd";
import { EditOutlined, IdcardOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import {
  RecordInfoCard,
  RecordInfoField,
  RecordDetailGrid,
  RecordHeader,
  RelatedListCard,
} from "@/components/crm/RecordDetailLayout";
import {
  emptyValue,
  formatDateTime,
} from "@/components/crm/RecordSections";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";

type RelatedRowProps = {
  title: string;
  description?: string;
  onView: () => void;
};

const RelatedRow = ({ title, description, onView }: RelatedRowProps) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
    <div className="min-w-0">
      <div className="truncate font-medium text-gray-900">{title}</div>
      {description && (
        <div className="mt-1 truncate text-sm text-gray-500">{description}</div>
      )}
    </div>
    <Button type="link" onClick={onView}>
      Xem
    </Button>
  </div>
);

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [relatedOpps, setRelatedOpps] = useState<Opportunity[]>([]);
  const [relatedCases, setRelatedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      setLoading(true);
      const [contactData, opportunities, cases] = await Promise.all([
        contactsApi.getById(id),
        opportunitiesApi.getAll({ contactId: id, page: 1, limit: 10 }),
        casesApi.getAll({ contactId: id, page: 1, limit: 10 }),
      ]);
      setContact(contactData);
      setRelatedOpps(opportunities);
      setRelatedCases(cases);
    } catch {
      message.error("Không thể tải chi tiết người liên hệ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchContact, 0);
    return () => window.clearTimeout(timer);
  }, [fetchContact]);

  const handleUpdate = async (values: Partial<Contact>) => {
    try {
      setSaving(true);
      const updatePayload = { ...values };
      delete updatePayload.accountId;
      await contactsApi.update(id, updatePayload);
      message.success("Đã cập nhật người liên hệ");
      setIsEditing(false);
      fetchContact();
    } catch {
      message.error("Không thể cập nhật người liên hệ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await contactsApi.delete(id);
      message.success("Đã xóa người liên hệ");
      router.push("/dashboard/contacts");
    } catch {
      message.error("Không thể xóa người liên hệ");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!contact) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  const contactName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <RecordHeader
        eyebrow="Người liên hệ"
        title={contactName}
        icon={<IdcardOutlined />}
        subtitleItems={[
          <>Chức danh: {emptyValue(contact.title)}</>,
          <>Email: {emptyValue(contact.email)}</>,
          <>Số điện thoại: {emptyValue(contact.phone)}</>,
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

      {isEditing ? (
        <Card title="Chỉnh sửa người liên hệ" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={contact}
            onFinish={handleUpdate}
          >
            <div className="crm-form-grid">
              <Form.Item name="firstName" label="Họ">
                <Input />
              </Form.Item>
              <Form.Item
                name="lastName"
                label="Tên"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="title" label="Chức danh">
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>
            </div>
            <SourceFields />
            <div className="mt-3 text-sm text-gray-500">
              Khách hàng / công ty được hiển thị trong tab Liên quan vì form này
              chưa hỗ trợ đổi khách hàng / công ty của người liên hệ.
            </div>
            <div className="crm-form-actions">
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
                    <RecordInfoField label="Tên">
                      {contactName}
                    </RecordInfoField>
                    <RecordInfoField label="Chức danh">
                      {emptyValue(contact.title)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin liên hệ">
                    <RecordInfoField label="Email">
                      {emptyValue(contact.email)}
                    </RecordInfoField>
                    <RecordInfoField label="Số điện thoại">
                      {emptyValue(contact.phone)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin nguồn">
                    <RecordInfoField label="Nguồn">
                      {getSourceLabel(contact.source)}
                    </RecordInfoField>
                    <RecordInfoField label="Chi tiết nguồn">
                      {emptyValue(contact.sourceDetail)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin hệ thống">
                    <RecordInfoField label="Người phụ trách">
                      <UserReferenceDisplay userId={contact.ownerId} />
                    </RecordInfoField>
                    <RecordInfoField label="Ngày tạo">
                      {formatDateTime(contact.createdAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Ngày cập nhật">
                      {formatDateTime(contact.updatedAt)}
                    </RecordInfoField>
                  </RecordInfoCard>
            </>
          }
          middle={<ActivityTimeline relatedType="CONTACT" relatedId={id} />}
          right={
            <>
                  <RecordInfoCard title="Khách hàng / Công ty">
                    <RecordInfoField label="Khách hàng / Công ty">
                      <EntityReferenceDisplay
                        entityType="ACCOUNT"
                        entityId={contact.accountId}
                        link
                      />
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RelatedListCard
                    title={SECTION_LABELS.relatedOpportunities}
                    items={relatedOpps}
                    emptyDescription="Không có cơ hội liên quan."
                    renderItem={(item) => (
                      <RelatedRow
                        title={item.name}
                        description={`${FIELD_LABELS.stage}: ${getStatusLabel(item.stage)}`}
                        onView={() => router.push(`/dashboard/opportunities/${item.id}`)}
                      />
                    )}
                  />
                  <RelatedListCard
                    title={SECTION_LABELS.relatedCases}
                    items={relatedCases}
                    emptyDescription="Không có yêu cầu hỗ trợ liên quan."
                    renderItem={(item) => (
                      <RelatedRow
                        title={item.subject}
                        description={`${FIELD_LABELS.status}: ${getStatusLabel(item.status)}`}
                        onView={() => router.push(`/dashboard/cases/${item.id}`)}
                      />
                    )}
                  />
            </>
          }
        />
      )}
    </div>
  );
}



