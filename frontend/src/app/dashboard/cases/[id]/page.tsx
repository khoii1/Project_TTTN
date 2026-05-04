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
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { SourceFields } from "@/components/crm/SourceFields";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { casesApi } from "@/features/cases/cases.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { Case, CaseStatus, CasePriority } from "@/features/cases/cases.types";
import { getSourceLabel } from "@/lib/constants/source-options";
import React from "react";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true);
      const data = await casesApi.getById(id);
      setCaseItem(data);
    } catch {
      message.error("Failed to load case details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCase();
      accountsApi.getAll().then(setAccounts).catch(console.error);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchCase]);

  const handleUpdate = async (values: Partial<Case>) => {
    try {
      setSaving(true);
      const updatePayload = { ...values };
      delete updatePayload.accountId;
      await casesApi.update(id, updatePayload);
      message.success("Case updated");
      setIsEditing(false);
      fetchCase();
    } catch {
      message.error("Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (current: number) => {
    const statuses = Object.values(CaseStatus);
    const newStatus = statuses[current];
    try {
      await casesApi.updateStatus(id, newStatus);
      message.success(`Status updated to ${newStatus}`);
      fetchCase();
    } catch {
      message.error("Failed to update status");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!caseItem) return <div>Case not found</div>;

  const statuses = Object.values(CaseStatus);
  const currentStep = statuses.indexOf(caseItem.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={caseItem.subject}
        showBack
        action={
          !isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>
        }
      />

      <Card className="shadow-sm">
        <Steps
          current={currentStep}
          onChange={handleStatusChange}
          className="mb-8 overflow-x-auto"
          items={statuses.map((status) => ({ title: status }))}
        />

        {isEditing ? (
          <Form layout="vertical" initialValues={caseItem} onFinish={handleUpdate}>
            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={4} />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="priority" label="Priority">
                <Select>
                  {Object.values(CasePriority).map((p) => (
                    <Select.Option key={p} value={p}>
                      {p}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="accountId" label="Account">
                <Select
                  placeholder="Select an Account"
                  showSearch
                  optionFilterProp="children"
                  allowClear
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
            <Descriptions.Item label="Subject" span={2}>
              {caseItem.subject}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {caseItem.status}
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              {caseItem.priority}
            </Descriptions.Item>
            <Descriptions.Item label="Account">
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={caseItem.accountId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Contact">
              <EntityReferenceDisplay
                entityType="CONTACT"
                entityId={caseItem.contactId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={caseItem.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Assigned To">
              <UserReferenceDisplay userId={caseItem.assignedToId} />
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {getSourceLabel(caseItem.source)}
            </Descriptions.Item>
            <Descriptions.Item label="Source Detail">
              {caseItem.sourceDetail || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(caseItem.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {caseItem.description || "N/A"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <ActivityTimeline relatedType="CASE" relatedId={id} />
    </div>
  );
}
