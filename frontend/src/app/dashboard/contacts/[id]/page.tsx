"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Popconfirm, Space, Spin, Tabs, App } from "antd";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import {
  emptyValue,
  formatDateTime,
  RelatedEmpty,
  SectionCard,
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
      <PageHeader
        title={contactName}
        subtitle={[contact.title, contact.email].filter(Boolean).join(" - ")}
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

      {isEditing ? (
        <Card title="Chỉnh sửa người liên hệ" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={contact}
            onFinish={handleUpdate}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="firstName" label="Tên">
                <Input />
              </Form.Item>
              <Form.Item
                name="lastName"
                label="Họ"
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
                    <Descriptions.Item label="Tên">
                      {contactName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chức danh">
                      {emptyValue(contact.title)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin liên hệ">
                    <Descriptions.Item label="Email">
                      {emptyValue(contact.email)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">
                      {emptyValue(contact.phone)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin nguồn">
                    <Descriptions.Item label="Nguồn">
                      {getSourceLabel(contact.source)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi tiết nguồn">
                      {emptyValue(contact.sourceDetail)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={contact.ownerId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(contact.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(contact.updatedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <SectionCard title="Khách hàng / Công ty">
                    <Descriptions.Item label="Khách hàng / Công ty">
                      <EntityReferenceDisplay
                        entityType="ACCOUNT"
                        entityId={contact.accountId}
                        link
                      />
                    </Descriptions.Item>
                  </SectionCard>
                  <Card
                    title={`${SECTION_LABELS.relatedOpportunities} (${relatedOpps.length})`}
                    className="shadow-sm"
                  >
                    {relatedOpps.length ? (
                      relatedOpps.map((item) => (
                        <RelatedRow
                          key={item.id}
                          title={item.name}
                          description={`${FIELD_LABELS.stage}: ${getStatusLabel(item.stage)}`}
                          onView={() =>
                            router.push(`/dashboard/opportunities/${item.id}`)
                          }
                        />
                      ))
                    ) : (
                      <RelatedEmpty description="Không có cơ hội liên quan." />
                    )}
                  </Card>
                  <Card
                    title={`${SECTION_LABELS.relatedCases} (${relatedCases.length})`}
                    className="shadow-sm"
                  >
                    {relatedCases.length ? (
                      relatedCases.map((item) => (
                        <RelatedRow
                          key={item.id}
                          title={item.subject}
                          description={`${FIELD_LABELS.status}: ${getStatusLabel(item.status)}`}
                          onView={() =>
                            router.push(`/dashboard/cases/${item.id}`)
                          }
                        />
                      ))
                    ) : (
                      <RelatedEmpty description="Không có yêu cầu hỗ trợ liên quan." />
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: "activity",
              label: "Hoạt động",
              children: (
                <ActivityTimeline relatedType="CONTACT" relatedId={id} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
