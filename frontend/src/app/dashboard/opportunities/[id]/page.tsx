"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Spin,
  Tag,
  App,
} from "antd";
import { BankOutlined, CalendarOutlined, DollarOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { OpportunitySalesCards } from "@/components/crm/OpportunitySalesCards";
import { RecordAttachmentsCard } from "@/components/crm/RecordAttachmentsCard";
import {
  RecordDetailGrid,
  RecordHeader,
  StagePath,
} from "@/components/crm/RecordDetailLayout";
import {
  emptyValue,
  formatDate,
  formatDateTime,
  RelatedEmpty,
} from "@/components/crm/RecordSections";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import {
  Opportunity,
  OpportunityStage,
} from "@/features/opportunities/opportunities.types";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { Task } from "@/features/tasks/tasks.types";
import { tasksApi } from "@/features/tasks/tasks.api";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";
import { formatVndAmount } from "@/lib/utils/currency";

type InfoCardProps = {
  title: string;
  children: React.ReactNode;
};

type InfoFieldProps = {
  label: string;
  children: React.ReactNode;
};

const InfoCard = ({ title, children }: InfoCardProps) => (
  <Card title={title} size="small" className="shadow-sm">
    <div className="record-info-fields">{children}</div>
  </Card>
);

const InfoField = ({ label, children }: InfoFieldProps) => (
  <div className="record-info-field">
    <div className="record-info-label">{label}</div>
    <div className="record-info-value">{children}</div>
  </div>
);

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = React.use(params);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOpportunity = useCallback(async () => {
    try {
      setLoading(true);
      const [oppData, tasks] = await Promise.all([
        opportunitiesApi.getById(id),
        tasksApi.getAll({
          relatedType: "OPPORTUNITY",
          relatedId: id,
          page: 1,
          limit: 10,
        }),
      ]);
      setOpportunity(oppData);
      setRelatedTasks(tasks);
    } catch {
      message.error("Không thể tải chi tiết cơ hội bán hàng");
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    const timer = window.setTimeout(fetchOpportunity, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOpportunity]);

  const handleUpdate = async (
    values: Partial<Opportunity> & { closeDate?: dayjs.Dayjs },
  ) => {
    try {
      setSaving(true);
      const payload = {
        ...values,
        closeDate: values.closeDate
          ? values.closeDate.toISOString()
          : undefined,
      };
      delete payload.accountId;
      delete payload.contactId;
      await opportunitiesApi.update(id, payload);
      message.success("Đã cập nhật cơ hội bán hàng");
      setIsEditing(false);
      fetchOpportunity();
    } catch {
      message.error("Không thể cập nhật cơ hội bán hàng");
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (current: number) => {
    const newStage = Object.values(OpportunityStage)[current];
    try {
      await opportunitiesApi.updateStage(id, newStage);
      message.success(`Đã cập nhật giai đoạn: ${getStatusLabel(newStage)}`);
      fetchOpportunity();
    } catch {
      message.error("Không thể cập nhật giai đoạn");
    }
  };

  const handleDelete = async () => {
    try {
      await opportunitiesApi.delete(id);
      message.success("Đã xóa cơ hội bán hàng");
      router.push("/dashboard/opportunities");
    } catch {
      message.error("Không thể xóa cơ hội bán hàng");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!opportunity) return <div>{EMPTY_STATE_LABELS.recordNotFound}</div>;

  const stages = Object.values(OpportunityStage);

  return (
    <div className="space-y-6">
      <RecordHeader
        eyebrow="Cơ hội bán hàng"
        title={opportunity.name}
        icon={<DollarOutlined />}
        testId="opportunity-record-header"
        subtitleItems={[
          <>
            Giai đoạn:{" "}
            <strong className="text-gray-800">
              {getStatusLabel(opportunity.stage)}
            </strong>
          </>,
          <>Ngày chốt dự kiến: {formatDate(opportunity.closeDate)}</>,
          <>Giá trị: {formatVndAmount(opportunity.amount)}</>,
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
        stages={stages}
        currentStage={opportunity.stage}
        getLabel={getStatusLabel}
        onChange={handleStageChange}
        testIdPrefix="opportunity-stage"
      />

      {isEditing ? (
        <Card title="Chỉnh sửa cơ hội bán hàng" className="shadow-sm">
          <Form
            layout="vertical"
            initialValues={{
              ...opportunity,
              closeDate: opportunity.closeDate
                ? dayjs(opportunity.closeDate)
                : undefined,
            }}
            onFinish={handleUpdate}
          >
            <Form.Item
              name="name"
              label="Tên cơ hội bán hàng"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <div className="crm-form-grid">
              <Form.Item label="Giá trị">
                <Space.Compact className="w-full">
                  <Form.Item name="amount" noStyle>
                    <InputNumber
                      className="w-full"
                      placeholder="Nhập giá trị cơ hội"
                    />
                  </Form.Item>
                  <Button disabled>VNĐ</Button>
                </Space.Compact>
              </Form.Item>
              <Form.Item name="closeDate" label="Ngày chốt dự kiến">
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item name="nextStep" label="Bước tiếp theo">
                <Input />
              </Form.Item>
            </div>
            <SourceFields />
            <div className="mt-3 text-sm text-gray-500">
              Khách hàng / công ty và người liên hệ được hiển thị trong phần
              Liên kết chính vì form này chưa hỗ trợ đổi các liên kết đó.
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
            <InfoCard title="Thông tin chung">
              <InfoField label="Tên">
                {emptyValue(opportunity.name)}
              </InfoField>
              <InfoField label="Giai đoạn">
                <Tag color="blue">{getStatusLabel(opportunity.stage)}</Tag>
              </InfoField>
              <InfoField label="Giá trị">
                {formatVndAmount(opportunity.amount)}
              </InfoField>
              <InfoField label="Ngày chốt dự kiến">
                {formatDate(opportunity.closeDate)}
              </InfoField>
              <InfoField label="Bước tiếp theo">
                {emptyValue(opportunity.nextStep)}
              </InfoField>
              <InfoField label="Mô tả">
                <span className="whitespace-pre-wrap">
                  {emptyValue(opportunity.description)}
                </span>
              </InfoField>
            </InfoCard>

            <InfoCard title="Thông tin nguồn">
              <InfoField label="Nguồn">
                {getSourceLabel(opportunity.source)}
              </InfoField>
              <InfoField label="Chi tiết nguồn">
                {emptyValue(opportunity.sourceDetail)}
              </InfoField>
            </InfoCard>

            <InfoCard title="Thông tin hệ thống">
              <InfoField label="Người phụ trách">
                <UserReferenceDisplay userId={opportunity.ownerId} />
              </InfoField>
              <InfoField label="Người cập nhật giai đoạn gần nhất">
                <UserReferenceDisplay userId={opportunity.stageChangedById} />
              </InfoField>
              <InfoField label="Thời gian cập nhật giai đoạn">
                {formatDateTime(opportunity.stageChangedAt)}
              </InfoField>
              <InfoField label="Ngày tạo">
                {formatDateTime(opportunity.createdAt)}
              </InfoField>
              <InfoField label="Ngày cập nhật">
                {formatDateTime(opportunity.updatedAt)}
              </InfoField>
            </InfoCard>
            </>
          }
          middle={
            <ActivityTimeline relatedType="OPPORTUNITY" relatedId={id} />
          }
          right={
            <>
            <Card title="Liên kết chính" size="small" className="shadow-sm">
              <div className="space-y-3">
                <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                    <BankOutlined />
                    Khách hàng / Công ty
                  </div>
                  <EntityReferenceDisplay
                    entityType="ACCOUNT"
                    entityId={opportunity.accountId}
                    link
                  />
                </div>
                <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                    Người liên hệ
                  </div>
                  <EntityReferenceDisplay
                    entityType="CONTACT"
                    entityId={opportunity.contactId}
                    link
                  />
                </div>
              </div>
            </Card>

            <Card title="Tóm tắt cơ hội" size="small" className="shadow-sm">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <DollarOutlined className="mt-1 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatVndAmount(opportunity.amount)}
                    </div>
                    <div className="text-gray-500">Giá trị dự kiến</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarOutlined className="mt-1 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatDate(opportunity.closeDate)}
                    </div>
                    <div className="text-gray-500">Ngày chốt dự kiến</div>
                  </div>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <div className="mb-1 font-semibold text-gray-700">
                    Bước tiếp theo
                  </div>
                  <div className="text-gray-600">
                    {emptyValue(opportunity.nextStep)}
                  </div>
                </div>
              </div>
            </Card>

            <OpportunitySalesCards
              opportunityId={id}
              opportunityName={opportunity.name}
            />

            <Card
              title={`${SECTION_LABELS.relatedTasks} (${relatedTasks.length})`}
              size="small"
              className="shadow-sm"
            >
              {relatedTasks.length ? (
                <div className="divide-y divide-gray-100">
                  {relatedTasks.map((task) => (
                    <div key={task.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="font-medium text-gray-900">
                        {task.subject}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <Tag
                          color={
                            task.status === "COMPLETED" ? "green" : "orange"
                          }
                        >
                          {getStatusLabel(task.status)}
                        </Tag>
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                      <Button
                        type="link"
                        className="mt-1 p-0"
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      >
                        Xem công việc
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <RelatedEmpty description="Không có công việc liên quan." />
              )}
            </Card>

            <RecordAttachmentsCard entityType="OPPORTUNITY" recordId={id} />
            </>
          }
        />
      )}
    </div>
  );
}
