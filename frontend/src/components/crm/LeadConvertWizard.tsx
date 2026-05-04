"use client";

import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Typography,
} from "antd";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { RelatedRecordLookup } from "@/components/crm/RelatedRecordLookup";
import {
  ConvertLeadPayload,
  Lead,
  LeadConvertMode,
  LeadConvertOpportunityMode,
} from "@/features/leads/leads.types";
import { getSourceLabel } from "@/lib/constants/source-options";

type LeadConvertWizardProps = {
  open: boolean;
  lead: Lead;
  loading?: boolean;
  onCancel: () => void;
  onConvert: (payload: ConvertLeadPayload) => Promise<void>;
};

type LeadConvertFormValues = {
  accountMode: LeadConvertMode;
  accountId?: string;
  contactMode: LeadConvertMode;
  contactId?: string;
  opportunityMode: LeadConvertOpportunityMode;
  opportunityId?: string;
  opportunityName?: string;
};

const sourceValue = (lead: Lead) => lead.source || "CONVERTED_LEAD";

export function LeadConvertWizard({
  open,
  lead,
  loading,
  onCancel,
  onConvert,
}: LeadConvertWizardProps) {
  const [form] = Form.useForm<LeadConvertFormValues>();
  const accountMode = Form.useWatch("accountMode", form);
  const contactMode = Form.useWatch("contactMode", form);
  const opportunityMode = Form.useWatch("opportunityMode", form);
  const accountId = Form.useWatch("accountId", form);
  const contactId = Form.useWatch("contactId", form);
  const opportunityId = Form.useWatch("opportunityId", form);
  const opportunityName = Form.useWatch("opportunityName", form);

  const initialValues: LeadConvertFormValues = {
    accountMode: "CREATE_NEW",
    contactMode: "CREATE_NEW",
    opportunityMode: "CREATE_NEW",
    opportunityName: `New Opportunity - ${lead.company}`,
  };

  const handleFinish = async (values: LeadConvertFormValues) => {
    const payload: ConvertLeadPayload = {
      accountMode: values.accountMode,
      contactMode: values.contactMode,
      opportunityMode: values.opportunityMode,
    };

    if (values.accountMode === "USE_EXISTING") {
      payload.accountId = values.accountId;
    }
    if (values.contactMode === "USE_EXISTING") {
      payload.contactId = values.contactId;
    }
    if (values.opportunityMode === "USE_EXISTING") {
      payload.opportunityId = values.opportunityId;
    }
    if (values.opportunityMode === "CREATE_NEW") {
      payload.opportunityName = values.opportunityName;
    }

    await onConvert(payload);
  };

  return (
    <Modal
      title="Convert Lead"
      open={open}
      onCancel={onCancel}
      width={900}
      footer={null}
      forceRender
      destroyOnHidden
    >
      {lead.status !== "QUALIFIED" && (
        <Alert
          type="warning"
          showIcon
          title="This lead is not marked as Qualified yet."
          className="mb-4"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section>
            <Typography.Title level={5}>Account</Typography.Title>
            <Form.Item name="accountMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Create New Account</Radio>
                  <Radio value="USE_EXISTING">Use Existing Account</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {accountMode === "USE_EXISTING" ? (
              <Form.Item
                name="accountId"
                label="Account"
                rules={[{ required: true, message: "Select an account" }]}
              >
                <RelatedRecordLookup relatedType="ACCOUNT" />
              </Form.Item>
            ) : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Name">
                  {lead.company}
                </Descriptions.Item>
                <Descriptions.Item label="Website">
                  {lead.website || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {lead.phone || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          <section>
            <Typography.Title level={5}>Contact</Typography.Title>
            <Form.Item name="contactMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Create New Contact</Radio>
                  <Radio value="USE_EXISTING">Use Existing Contact</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {contactMode === "USE_EXISTING" ? (
              <Form.Item
                name="contactId"
                label="Contact"
                rules={[{ required: true, message: "Select a contact" }]}
              >
                <RelatedRecordLookup relatedType="CONTACT" />
              </Form.Item>
            ) : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Name">
                  {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {lead.email || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {lead.phone || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Title">
                  {lead.title || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          <section>
            <Typography.Title level={5}>Opportunity</Typography.Title>
            <Form.Item name="opportunityMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Create New Opportunity</Radio>
                  <Radio value="DO_NOT_CREATE">Do not create Opportunity</Radio>
                  <Radio value="USE_EXISTING">Use Existing Opportunity</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {opportunityMode === "USE_EXISTING" && (
              <Form.Item
                name="opportunityId"
                label="Opportunity"
                rules={[{ required: true, message: "Select an opportunity" }]}
              >
                <RelatedRecordLookup relatedType="OPPORTUNITY" />
              </Form.Item>
            )}
            {opportunityMode === "CREATE_NEW" && (
              <Form.Item
                name="opportunityName"
                label="Opportunity Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            )}
          </section>
        </div>

        <Divider />

        <Typography.Title level={5}>Preview</Typography.Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Lead">
            {[lead.firstName, lead.lastName].filter(Boolean).join(" ")} ·{" "}
            {lead.company}
          </Descriptions.Item>
          <Descriptions.Item label="Account">
            {accountMode === "USE_EXISTING" ? (
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={accountId}
                link
              />
            ) : (
              `Create "${lead.company}"`
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Contact">
            {contactMode === "USE_EXISTING" ? (
              <EntityReferenceDisplay
                entityType="CONTACT"
                entityId={contactId}
                link
              />
            ) : (
              `Create "${[lead.firstName, lead.lastName].filter(Boolean).join(" ")}"`
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Opportunity">
            {opportunityMode === "DO_NOT_CREATE" && "Do not create"}
            {opportunityMode === "USE_EXISTING" && (
              <EntityReferenceDisplay
                entityType="OPPORTUNITY"
                entityId={opportunityId}
                link
              />
            )}
            {opportunityMode === "CREATE_NEW" &&
              `Create "${opportunityName || initialValues.opportunityName}"`}
          </Descriptions.Item>
          <Descriptions.Item label="Source Propagation">
            {getSourceLabel(sourceValue(lead))} → Account / Contact
            {opportunityMode === "DO_NOT_CREATE" ? "" : " / Opportunity"}
          </Descriptions.Item>
          <Descriptions.Item label="Source Detail">
            {lead.sourceDetail || "-"}
          </Descriptions.Item>
        </Descriptions>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Confirm Convert
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
