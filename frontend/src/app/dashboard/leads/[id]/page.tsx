"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Popconfirm, Spin, Tag, App } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { LeadConvertWizard } from "@/components/crm/LeadConvertWizard";
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
import { HcmWardSelect } from "@/components/crm/HcmWardSelect";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { leadsApi } from "@/features/leads/leads.api";
import {
  ConvertLeadPayload,
  Lead,
  LeadStatus,
} from "@/features/leads/leads.types";
import { getApiErrorMessage } from "@/lib/api/error";
import { HCM_PROVINCE_NAME } from "@/lib/constants/hcm-wards";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FIELD_LABELS,
  FEEDBACK_LABELS,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";

const { TextArea } = Input;

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
      await leadsApi.update(id, {
        ...values,
        provinceName: values.provinceName || HCM_PROVINCE_NAME,
      });
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
      const result = await leadsApi.convert(id, payload);
      const createdTaskCount = result.taskTemplateResult?.createdCount || 0;
      message.success(
        createdTaskCount > 0
          ? `Chuyển đổi khách hàng tiềm năng thành công và đã tạo ${createdTaskCount} công việc theo mẫu.`
          : result.taskTemplateResult?.message || "Chuyển đổi khách hàng tiềm năng thành công",
      );
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
  const isConverted = lead.status === LeadStatus.CONVERTED;
  const isQualified = lead.status === LeadStatus.QUALIFIED;
  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const descriptionSectionTitle =
    lead.source === "Website" ? "Nhu cầu tư vấn" : "Nhu cầu tư vấn / Mô tả";

  return (
    <div className="space-y-6">
      <RecordHeader
        eyebrow="Khách hàng tiềm năng"
        title={leadName}
        icon={<UserOutlined />}
        subtitleItems={[
          <>Trạng thái: <strong className="text-gray-800">{getStatusLabel(lead.status)}</strong></>,
          <>Công ty: {lead.company}</>,
          <>Người phụ trách: <UserReferenceDisplay userId={lead.ownerId} /></>,
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
          </>
        }
      />

      <StagePath
        stages={statuses}
        currentStage={lead.status}
        getLabel={getStatusLabel}
        onChange={!isConverted ? handleStatusChange : undefined}
        testIdPrefix="lead-status"
      />

      {isEditing ? (
        <Card title="Chỉnh sửa khách hàng tiềm năng" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={{
              ...lead,
              provinceName: lead.provinceName || HCM_PROVINCE_NAME,
            }}
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
              <Form.Item name="provinceName" label="Tỉnh/Thành phố">
                <Input disabled />
              </Form.Item>
              <Form.Item name="wardName" label="Phường/Xã">
                <HcmWardSelect placeholder="Gõ để tìm phường/xã" />
              </Form.Item>
            </div>
            <Form.Item name="addressDetail" label="Địa chỉ chi tiết">
              <Input maxLength={240} />
            </Form.Item>
            <SourceFields />
            <Form.Item name="description" label="Mô tả / Nhu cầu tư vấn">
              <TextArea
                rows={5}
                placeholder="Nhập nhu cầu tư vấn, ghi chú hoặc bối cảnh chăm sóc khách hàng"
              />
            </Form.Item>
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
                      {leadName}
                    </RecordInfoField>
                    <RecordInfoField label="Công ty">
                      {lead.company}
                    </RecordInfoField>
                    <RecordInfoField label="Chức danh">
                      {emptyValue(lead.title)}
                    </RecordInfoField>
                    <RecordInfoField label="Trạng thái">
                      <Tag color={isConverted ? "green" : "blue"}>
                        {getStatusLabel(lead.status)}
                      </Tag>
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin liên hệ">
                    <RecordInfoField label="Email">
                      {emptyValue(lead.email)}
                    </RecordInfoField>
                    <RecordInfoField label="Số điện thoại">
                      {emptyValue(lead.phone)}
                    </RecordInfoField>
                    <RecordInfoField label="Website">
                      {emptyValue(lead.website)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin nguồn">
                    <RecordInfoField label="Nguồn">
                      {getSourceLabel(lead.source)}
                    </RecordInfoField>
                    <RecordInfoField label="Chi tiết nguồn">
                      {emptyValue(lead.sourceDetail)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Khu vực phụ trách">
                    <RecordInfoField label="Tỉnh/Thành phố">
                      {emptyValue(lead.provinceName)}
                    </RecordInfoField>
                    <RecordInfoField label="Phường/Xã">
                      {emptyValue(lead.wardName)}
                    </RecordInfoField>
                    <RecordInfoField label="Địa chỉ chi tiết">
                      {emptyValue(lead.addressDetail)}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title={descriptionSectionTitle}>
                    <RecordInfoField label={FIELD_LABELS.description}>
                      {lead.description ? (
                        <div className="whitespace-pre-wrap leading-6">
                          {lead.description}
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          Chưa có thông tin nhu cầu tư vấn.
                        </span>
                      )}
                    </RecordInfoField>
                  </RecordInfoCard>
                  <RecordInfoCard title="Thông tin hệ thống">
                    <RecordInfoField label="Người phụ trách">
                      <UserReferenceDisplay userId={lead.ownerId} />
                    </RecordInfoField>
                    {isConverted && (
                      <>
                        <RecordInfoField label="Người chuyển đổi">
                          <UserReferenceDisplay userId={lead.convertedById} />
                        </RecordInfoField>
                        <RecordInfoField label="Thời gian chuyển đổi">
                          {formatDateTime(lead.convertedAt)}
                        </RecordInfoField>
                      </>
                    )}
                    <RecordInfoField label="Ngày tạo">
                      {formatDateTime(lead.createdAt)}
                    </RecordInfoField>
                    <RecordInfoField label="Ngày cập nhật">
                      {formatDateTime(lead.updatedAt)}
                    </RecordInfoField>
                  </RecordInfoCard>
            </>
          }
          middle={<ActivityTimeline relatedType="LEAD" relatedId={id} />}
          right={
            isConverted ? (
                <RecordInfoCard title={SECTION_LABELS.convertedRecords}>
                  <RecordInfoField label="Khách hàng / Công ty">
                    <EntityReferenceDisplay
                      entityType="ACCOUNT"
                      entityId={lead.convertedAccountId}
                      link
                    />
                  </RecordInfoField>
                  <RecordInfoField label="Người liên hệ">
                    <EntityReferenceDisplay
                      entityType="CONTACT"
                      entityId={lead.convertedContactId}
                      link
                    />
                  </RecordInfoField>
                  <RecordInfoField label="Cơ hội bán hàng">
                    <EntityReferenceDisplay
                      entityType="OPPORTUNITY"
                      entityId={lead.convertedOpportunityId}
                      link
                    />
                  </RecordInfoField>
                </RecordInfoCard>
              ) : (
                <EmptyStateCard
                  title={SECTION_LABELS.convertedRecords}
                  description="Chưa có bản ghi chuyển đổi."
                />
              )
          }
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


