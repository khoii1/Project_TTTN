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
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { LeadConvertWizard } from "@/components/crm/LeadConvertWizard";
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
import React from "react";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [isConvertWizardOpen, setIsConvertWizardOpen] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadsApi.getById(id);
      setLead(data);
    } catch {
      message.error("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLead();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchLead]);

  const handleUpdate = async (values: Partial<Lead>) => {
    try {
      setSaving(true);
      await leadsApi.update(id, values);
      message.success("Lead updated");
      setIsEditing(false);
      fetchLead();
    } catch {
      message.error("Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (current: number) => {
    const statuses = Object.values(LeadStatus);
    const newStatus = statuses[current];
    try {
      await leadsApi.updateStatus(id, newStatus);
      message.success(`Status updated to ${newStatus}`);
      fetchLead();
    } catch {
      message.error("Failed to update status");
    }
  };

  const handleConvert = async (payload: ConvertLeadPayload) => {
    try {
      setConverting(true);
      await leadsApi.convert(id, payload);
      message.success("Lead converted successfully!");
      setIsConvertWizardOpen(false);
      fetchLead();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to convert lead"));
    } finally {
      setConverting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!lead) return <div>Lead not found</div>;

  const statuses = Object.values(LeadStatus);
  const currentStep = statuses.indexOf(lead.status);
  const isConverted = lead.status === "CONVERTED";
  const isQualified = lead.status === "QUALIFIED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={lead.company}
        showBack
        action={
          <div className="space-x-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
            {!isConverted && (
              <Button
                type="primary"
                danger={!isQualified}
                className={isQualified ? "bg-green-600" : undefined}
                onClick={() => setIsConvertWizardOpen(true)}
              >
                Convert Lead
              </Button>
            )}
          </div>
        }
      />

      <Card className="shadow-sm">
        <Steps
          current={currentStep}
          onChange={
            lead.status !== "CONVERTED" ? handleStatusChange : undefined
          }
          className="mb-8 overflow-x-auto"
          items={statuses.map((status) => ({ title: status }))}
        />

        {isEditing ? (
          <Form layout="vertical" initialValues={lead} onFinish={handleUpdate}>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Phone">
                <Input />
              </Form.Item>
              <Form.Item name="company" label="Company">
                <Input />
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
            <Descriptions.Item label="First Name">
              {lead.firstName}
            </Descriptions.Item>
            <Descriptions.Item label="Last Name">
              {lead.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">
              {lead.phone || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Company">
              {lead.company || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{lead.status}</Descriptions.Item>
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={lead.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {getSourceLabel(lead.source)}
            </Descriptions.Item>
            <Descriptions.Item label="Source Detail">
              {lead.sourceDetail || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(lead.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(lead.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {isConverted && (
        <Card title="Converted Records" className="shadow-sm">
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Account">
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={lead.convertedAccountId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Contact">
              <EntityReferenceDisplay
                entityType="CONTACT"
                entityId={lead.convertedContactId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Opportunity">
              <EntityReferenceDisplay
                entityType="OPPORTUNITY"
                entityId={lead.convertedOpportunityId}
                link
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <ActivityTimeline relatedType="LEAD" relatedId={id} />

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
