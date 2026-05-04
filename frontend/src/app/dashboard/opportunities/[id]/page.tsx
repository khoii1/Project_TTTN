"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Spin,
  message,
  Button,
  Steps,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { SourceFields } from "@/components/crm/SourceFields";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import {
  Opportunity,
  OpportunityStage,
} from "@/features/opportunities/opportunities.types";
import dayjs from "dayjs";
import { getSourceLabel } from "@/lib/constants/source-options";
import React from "react";

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOpportunity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await opportunitiesApi.getById(id);
      setOpportunity(data);
    } catch {
      message.error("Failed to load opportunity details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchOpportunity();
      accountsApi.getAll().then(setAccounts).catch(console.error);
    }, 0);

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
      await opportunitiesApi.update(id, payload);
      message.success("Opportunity updated");
      setIsEditing(false);
      fetchOpportunity();
    } catch {
      message.error("Failed to update opportunity");
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (current: number) => {
    const stages = Object.values(OpportunityStage);
    const newStage = stages[current];
    try {
      await opportunitiesApi.updateStage(id, newStage);
      message.success(`Stage updated to ${newStage}`);
      fetchOpportunity();
    } catch {
      message.error("Failed to update stage");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!opportunity) return <div>Opportunity not found</div>;

  const stages = Object.values(OpportunityStage);
  const currentStep = stages.indexOf(opportunity.stage);

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.name}
        subtitle={accounts.find((a) => a.id === opportunity.accountId)?.name}
        showBack
        action={
          !isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>
        }
      />

      <Card className="shadow-sm">
        <Steps
          current={currentStep}
          onChange={handleStageChange}
          className="mb-8 overflow-x-auto"
          items={stages.map((stage) => ({ title: stage }))}
        />

        {isEditing ? (
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
              label="Opportunity Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="amount" label="Amount">
                <InputNumber className="w-full" />
              </Form.Item>
              <Form.Item name="closeDate" label="Close Date">
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item
                name="accountId"
                label="Account"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select an Account"
                  showSearch
                  optionFilterProp="children"
                >
                  {accounts.map((acc) => (
                    <Select.Option key={acc.id} value={acc.id}>
                      {acc.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <SourceFields />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="Name">
              {opportunity.name}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              {opportunity.amount
                ? `$${opportunity.amount.toLocaleString()}`
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Stage">
              {opportunity.stage}
            </Descriptions.Item>
            <Descriptions.Item label="Close Date">
              {opportunity.closeDate
                ? new Date(opportunity.closeDate).toLocaleDateString()
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Account">
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={opportunity.accountId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={opportunity.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Contact">
              <EntityReferenceDisplay
                entityType="CONTACT"
                entityId={opportunity.contactId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {getSourceLabel(opportunity.source)}
            </Descriptions.Item>
            <Descriptions.Item label="Source Detail">
              {opportunity.sourceDetail || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(opportunity.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <ActivityTimeline relatedType="OPPORTUNITY" relatedId={id} />
    </div>
  );
}
