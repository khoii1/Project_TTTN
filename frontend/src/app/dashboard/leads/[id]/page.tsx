"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Popconfirm, Space, Spin, Steps, Tabs, Tag, App } from "antd";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { LeadConvertWizard } from "@/components/crm/LeadConvertWizard";
import {
  emptyValue,
  formatDateTime,
  SectionCard,
} from "@/components/crm/RecordSections";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { leadsApi } from "@/features/leads/leads.api";
import {
  ConvertLeadPayload,
  Lead,
  LeadStatus,
} from "@/features/leads/leads.types";
import { getApiErrorMessage } from "@/lib/api/error";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [isConvertWizardOpen, setIsConvertWizardOpen] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      setLead(await leadsApi.getById(id));
    } catch {
      message.error("Không thể tải chi tiết khách hàng tiềm năng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(fetchLead, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLead]);

  const handleUpdate = async (values: Partial<Lead>) => {
    try {
      setSaving(true);
      await leadsApi.update(id, values);
      message.success("Đã cập nhật khách hàng tiềm năng");
      setIsEditing(false);
      fetchLead();
    } catch {
      message.error("Không thể cập nhật khách hàng tiềm năng");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (current: number) => {
    const newStatus = Object.values(LeadStatus)[current];
    try {
      await leadsApi.updateStatus(id, newStatus);
      message.success(`Đã cập nhật trạng thái: ${getStatusLabel(newStatus)}`);
      fetchLead();
    } catch {
      message.error("Không thể cập nhật trạng thái");
    }
  };

  const handleConvert = async (payload: ConvertLeadPayload) => {
    try {
      setConverting(true);
      await leadsApi.convert(id, payload);
      message.success("Chuyển đổi khách hàng tiềm năng thành công");
      setIsConvertWizardOpen(false);
      fetchLead();
    } catch (error: unknown) {
      message.error(
        getApiErrorMessage(error, "Không thể chuyển đổi khách hàng tiềm năng"),
      );
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await leadsApi.delete(id);
      message.success("Đã xóa khách hàng tiềm năng");
      router.push("/dashboard/leads");
    } catch {
      message.error("Không thể xóa khách hàng tiềm năng");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!lead) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  const statuses = Object.values(LeadStatus);
  const currentStep = statuses.indexOf(lead.status);
  const isConverted = lead.status === LeadStatus.CONVERTED;
  const isQualified = lead.status === LeadStatus.QUALIFIED;
  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={leadName}
        subtitle={`${lead.company} - ${getStatusLabel(lead.status)}`}
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
            {!isConverted && (
              <Button
                type="primary"
                danger={!isQualified}
                className={isQualified ? "bg-green-600" : undefined}
                onClick={() => setIsConvertWizardOpen(true)}
              >
                Chuyển đổi khách hàng tiềm năng
              </Button>
            )}
          </Space>
        }
      />

      <Card className="shadow-sm">
        <Steps
          current={currentStep}
          onChange={!isConverted ? handleStatusChange : undefined}
          className="overflow-x-auto"
          items={statuses.map((status) => ({ title: getStatusLabel(status) }))}
        />
      </Card>

      {isEditing ? (
        <Card title="Chỉnh sửa khách hàng tiềm năng" className="shadow-sm">
          <Form layout="vertical" initialValues={lead} onFinish={handleUpdate}>
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
              <Form.Item name="company" label="Công ty">
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
                    <Descriptions.Item label="Tên">
                      {leadName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Công ty">
                      {lead.company}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chức danh">
                      {emptyValue(lead.title)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                      <Tag color={isConverted ? "green" : "blue"}>
                        {getStatusLabel(lead.status)}
                      </Tag>
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin liên hệ">
                    <Descriptions.Item label="Email">
                      {emptyValue(lead.email)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">
                      {emptyValue(lead.phone)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Website">
                      {emptyValue(lead.website)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin nguồn">
                    <Descriptions.Item label="Nguồn">
                      {getSourceLabel(lead.source)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi tiết nguồn">
                      {emptyValue(lead.sourceDetail)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={lead.ownerId} />
                    </Descriptions.Item>
                    {isConverted && (
                      <>
                        <Descriptions.Item label="Người chuyển đổi">
                          <UserReferenceDisplay userId={lead.convertedById} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Thời gian chuyển đổi">
                          {formatDateTime(lead.convertedAt)}
                        </Descriptions.Item>
                      </>
                    )}
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(lead.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(lead.updatedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: isConverted ? (
                <SectionCard title={SECTION_LABELS.convertedRecords}>
                  <Descriptions.Item label="Khách hàng / Công ty">
                    <EntityReferenceDisplay
                      entityType="ACCOUNT"
                      entityId={lead.convertedAccountId}
                      link
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Người liên hệ">
                    <EntityReferenceDisplay
                      entityType="CONTACT"
                      entityId={lead.convertedContactId}
                      link
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Cơ hội bán hàng">
                    <EntityReferenceDisplay
                      entityType="OPPORTUNITY"
                      entityId={lead.convertedOpportunityId}
                      link
                    />
                  </Descriptions.Item>
                </SectionCard>
              ) : (
                <Card className="shadow-sm">Chưa có bản ghi chuyển đổi.</Card>
              ),
            },
            {
              key: "activity",
              label: "Hoạt động",
              children: <ActivityTimeline relatedType="LEAD" relatedId={id} />,
            },
          ]}
        />
      )}

      <LeadConvertWizard
        open={isConvertWizardOpen}
        lead={lead}
        loading={converting}
        onCancel={() => setIsConvertWizardOpen(false)}
        onConvert={handleConvert}
      />
    </div>
  );
}
