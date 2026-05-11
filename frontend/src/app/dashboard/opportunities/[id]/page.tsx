"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  App,
} from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import {
  emptyValue,
  formatDate,
  formatDateTime,
  RelatedEmpty,
  SectionCard,
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
  }, [id]);

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
  const currentStep = stages.indexOf(opportunity.stage);

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.name}
        subtitle={`${getStatusLabel(opportunity.stage)} - ${formatDate(opportunity.closeDate)}`}
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
          onChange={handleStageChange}
          className="overflow-x-auto"
          items={stages.map((stage) => ({ title: getStatusLabel(stage) }))}
        />
      </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Descriptions.Item label="Tên">
                      {opportunity.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giai đoạn">
                      <Tag color="blue">
                        {getStatusLabel(opportunity.stage)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Giá trị">
                      {formatVndAmount(opportunity.amount)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày chốt dự kiến">
                      {formatDate(opportunity.closeDate)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bước tiếp theo">
                      {emptyValue(opportunity.nextStep)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin nguồn">
                    <Descriptions.Item label="Nguồn">
                      {getSourceLabel(opportunity.source)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chi tiết nguồn">
                      {emptyValue(opportunity.sourceDetail)}
                    </Descriptions.Item>
                  </SectionCard>
                  <SectionCard title="Thông tin hệ thống">
                    <Descriptions.Item label="Người phụ trách">
                      <UserReferenceDisplay userId={opportunity.ownerId} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Người cập nhật giai đoạn gần nhất">
                      <UserReferenceDisplay
                        userId={opportunity.stageChangedById}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian cập nhật giai đoạn">
                      {formatDateTime(opportunity.stageChangedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                      {formatDateTime(opportunity.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày cập nhật">
                      {formatDateTime(opportunity.updatedAt)}
                    </Descriptions.Item>
                  </SectionCard>
                </div>
              ),
            },
            {
              key: "related",
              label: "Liên quan",
              children: (
                <div className="space-y-4">
                  <SectionCard title="Liên kết chính">
                    <Descriptions.Item label="Khách hàng / Công ty">
                      <EntityReferenceDisplay
                        entityType="ACCOUNT"
                        entityId={opportunity.accountId}
                        link
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Người liên hệ">
                      <EntityReferenceDisplay
                        entityType="CONTACT"
                        entityId={opportunity.contactId}
                        link
                      />
                    </Descriptions.Item>
                  </SectionCard>
                  <Card
                    title={`${SECTION_LABELS.relatedTasks} (${relatedTasks.length})`}
                    className="shadow-sm"
                  >
                    {relatedTasks.length ? (
                      relatedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{task.subject}</div>
                            <div className="text-sm text-gray-500">
                              {getStatusLabel(task.status)}
                            </div>
                          </div>
                          <Button
                            type="link"
                            onClick={() =>
                              router.push(`/dashboard/tasks/${task.id}`)
                            }
                          >
                            Xem
                          </Button>
                        </div>
                      ))
                    ) : (
                      <RelatedEmpty description="Không có công việc liên quan." />
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: "activity",
              label: "Hoạt động",
              children: (
                <ActivityTimeline relatedType="OPPORTUNITY" relatedId={id} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
