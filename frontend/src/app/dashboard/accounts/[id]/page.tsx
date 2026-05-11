"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Popconfirm, Space, Spin, Tabs, Tag, App } from "antd";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import {
  emptyValue,
  formatDateTime,
  RelatedEmpty,
  SectionCard,
} from "@/components/crm/RecordSections";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
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

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [relatedContacts, setRelatedContacts] = useState<Contact[]>([]);
  const [relatedOpps, setRelatedOpps] = useState<Opportunity[]>([]);
  const [relatedCases, setRelatedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accData, allContacts, allOpps, allCases] = await Promise.all([
        accountsApi.getById(id),
        contactsApi.getAll({ accountId: id, page: 1, limit: 10 }),
        opportunitiesApi.getAll({ accountId: id, page: 1, limit: 10 }),
        casesApi.getAll({ accountId: id, page: 1, limit: 10 }),
      ]);

      setAccount(accData);
      setRelatedContacts(allContacts);
      setRelatedOpps(allOpps);
      setRelatedCases(allCases);
    } catch {
      message.error("Không thể tải chi tiết khách hàng / công ty");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const handleUpdate = async (values: Partial<Account>) => {
    try {
      setSaving(true);
      await accountsApi.update(id, values);
      message.success("Đã cập nhật khách hàng / công ty");
      setIsEditing(false);
      fetchData();
    } catch {
      message.error("Không thể cập nhật khách hàng / công ty");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await accountsApi.delete(id);
      message.success("Đã xóa khách hàng / công ty");
      router.push("/dashboard/accounts");
    } catch {
      message.error("Không thể xóa khách hàng / công ty");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!account) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        subtitle={[account.type, account.phone].filter(Boolean).join(" - ")}
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
        <Card title="Chỉnh sửa khách hàng / công ty" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={account}
            onFinish={handleUpdate}
          >
            <Form.Item
              name="name"
              label="Tên khách hàng / công ty"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="type" label="Loại">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>
              <Form.Item name="website" label="Website">
                <Input />
              </Form.Item>
            </div>
            <SourceFields />
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
                    <Descriptions.Item label="Tên khách hàng / công ty">
                      {account.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại">
                      {emptyValue(account.type)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">
                      {emptyValue(account.phone)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Website">
                      {emptyValue(account.website)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin địa chỉ">
                    <Descriptions.Item label="Địa chỉ thanh toán">
                      {[
                        account.billingStreet,
                        account.billingCity,
                        account.billingState,
                        account.billingPostalCode,
                        account.billingCountry,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ giao hàng">
                      {[
                        account.shippingStreet,
                        account.shippingCity,
                        account.shippingState,
                        account.shippingPostalCode,
                        account.shippingCountry,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin nguồn">
                    <Descriptions.Item label="Nguồn">
                      {getSourceLabel(account.source)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi tiết nguồn">
                      {emptyValue(account.sourceDetail)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={account.ownerId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(account.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(account.updatedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card
                    title={`${SECTION_LABELS.relatedContacts} (${relatedContacts.length})`}
                    className="shadow-sm"
                  >
                    {relatedContacts.length ? (
                      relatedContacts.map((item) => (
                        <RelatedRow
                          key={item.id}
                          title={[item.firstName, item.lastName]
                            .filter(Boolean)
                            .join(" ")}
                          description={item.email}
                          onView={() =>
                            router.push(`/dashboard/contacts/${item.id}`)
                          }
                        />
                      ))
                    ) : (
                      <RelatedEmpty description="Không có người liên hệ liên quan." />
                    )}
                  </Card>
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
                <ActivityTimeline relatedType="ACCOUNT" relatedId={id} />
              ),
            },
          ]}
        />
      )}

      {account.deletedAt && <Tag color="red">Đã xóa</Tag>}
    </div>
  );
}
