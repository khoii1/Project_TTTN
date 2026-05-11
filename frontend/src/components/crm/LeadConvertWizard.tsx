"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Descriptions, Divider, Empty, Form, Input, List, Modal, Radio, Space, Spin, Typography, App } from "antd";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { RelatedRecordLookup } from "@/components/crm/RelatedRecordLookup";
import { leadsApi } from "@/features/leads/leads.api";
import {
  ConvertLeadPayload,
  Lead,
  LeadConversionSuggestions,
  LeadConvertMode,
  LeadConvertOpportunityMode,
} from "@/features/leads/leads.types";
import { getSourceLabel } from "@/lib/constants/source-options";
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  FIELD_LABELS,
  getStatusLabel,
  SECTION_LABELS,
} from "@/lib/constants/vi-labels";

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
  const { message } = App.useApp();
  const [form] = Form.useForm<LeadConvertFormValues>();
  const [suggestions, setSuggestions] = useState<LeadConversionSuggestions>({
    accounts: [],
    contacts: [],
    opportunities: [],
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
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
    opportunityName: `Cơ hội mới - ${lead.company}`,
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setSuggestionsLoading(true);
      }
    });

    leadsApi
      .getConversionSuggestions(lead.id)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions({ accounts: [], contacts: [], opportunities: [] });
          message.warning("Không thể tải gợi ý chuyển đổi");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lead.id, open]);

  const suggestedContact = useMemo(
    () => suggestions.contacts.find((contact) => contact.id === contactId),
    [contactId, suggestions.contacts],
  );

  const suggestedOpportunity = useMemo(
    () =>
      suggestions.opportunities.find(
        (opportunity) => opportunity.id === opportunityId,
      ),
    [opportunityId, suggestions.opportunities],
  );

  const relationWarning =
    accountMode === "USE_EXISTING" && accountId
      ? suggestedContact &&
        contactMode === "USE_EXISTING" &&
        suggestedContact.accountId !== accountId
        ? "Người liên hệ đã chọn không thuộc khách hàng / công ty đã chọn."
        : suggestedOpportunity &&
            opportunityMode === "USE_EXISTING" &&
            suggestedOpportunity.accountId !== accountId
          ? "Cơ hội đã chọn không thuộc khách hàng / công ty đã chọn."
          : null
      : contactMode === "USE_EXISTING" && suggestedContact
        ? "Vui lòng chọn khách hàng / công ty của người liên hệ trước khi chuyển đổi."
        : opportunityMode === "USE_EXISTING" && suggestedOpportunity
          ? "Vui lòng chọn khách hàng / công ty của cơ hội trước khi chuyển đổi."
          : null;

  const hasSuggestions =
    suggestions.accounts.length > 0 ||
    suggestions.contacts.length > 0 ||
    suggestions.opportunities.length > 0;

  const handleFinish = async (values: LeadConvertFormValues) => {
    if (relationWarning) {
      message.error(relationWarning);
      return;
    }

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

  const getContactName = (
    contact: LeadConversionSuggestions["contacts"][number],
  ) => [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <Modal
      title={ACTION_LABELS.convertLead}
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
          title="Khách hàng tiềm năng này chưa được đánh dấu là Đủ điều kiện."
          className="mb-4"
        />
      )}

      <Card
        size="small"
        title={SECTION_LABELS.possibleExistingRecords}
        className="mb-4"
      >
        {suggestionsLoading ? (
          <div className="py-4 text-center">
            <Spin />
          </div>
        ) : !hasSuggestions ? (
          <Empty
            description="Không tìm thấy bản ghi phù hợp."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section>
              <Typography.Text strong>{ENTITY_LABELS.accounts}</Typography.Text>
              <List
                size="small"
                dataSource={suggestions.accounts}
                locale={{ emptyText: "Không có khách hàng / công ty phù hợp" }}
                renderItem={(account) => (
                  <List.Item
                    actions={[
                      <Button
                        key="use"
                        size="small"
                        onClick={() =>
                          form.setFieldsValue({
                            accountMode: "USE_EXISTING",
                            accountId: account.id,
                          })
                        }
                      >
                        Dùng khách hàng / công ty này
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={account.name}
                      description={account.phone || account.website || "-"}
                    />
                  </List.Item>
                )}
              />
            </section>

            <section>
              <Typography.Text strong>{ENTITY_LABELS.contacts}</Typography.Text>
              <List
                size="small"
                dataSource={suggestions.contacts}
                locale={{ emptyText: "Không có người liên hệ phù hợp" }}
                renderItem={(contact) => (
                  <List.Item
                    actions={[
                      <Button
                        key="use"
                        size="small"
                        onClick={() =>
                          form.setFieldsValue({
                            contactMode: "USE_EXISTING",
                            contactId: contact.id,
                          })
                        }
                      >
                        Dùng người liên hệ này
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={getContactName(contact)}
                      description={contact.email || contact.phone || "-"}
                    />
                  </List.Item>
                )}
              />
            </section>

            <section>
              <Typography.Text strong>
                {ENTITY_LABELS.opportunities}
              </Typography.Text>
              <List
                size="small"
                dataSource={suggestions.opportunities}
                locale={{ emptyText: "Không có cơ hội phù hợp" }}
                renderItem={(opportunity) => (
                  <List.Item
                    actions={[
                      <Button
                        key="use"
                        size="small"
                        onClick={() =>
                          form.setFieldsValue({
                            opportunityMode: "USE_EXISTING",
                            opportunityId: opportunity.id,
                          })
                        }
                      >
                        Dùng cơ hội này
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={opportunity.name}
                      description={getStatusLabel(opportunity.stage)}
                    />
                  </List.Item>
                )}
              />
            </section>
          </div>
        )}
      </Card>

      {relationWarning && (
        <Alert
          type="warning"
          showIcon
          title={relationWarning}
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
            <Typography.Title level={5}>{ENTITY_LABELS.account}</Typography.Title>
            <Form.Item name="accountMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Tạo mới khách hàng / công ty</Radio>
                  <Radio value="USE_EXISTING">
                    Dùng khách hàng / công ty có sẵn
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {accountMode === "USE_EXISTING" ? (
              <Form.Item
                name="accountId"
                label={ENTITY_LABELS.account}
                rules={[
                  {
                    required: true,
                    message: "Vui lòng chọn khách hàng / công ty",
                  },
                ]}
              >
                <RelatedRecordLookup relatedType="ACCOUNT" />
              </Form.Item>
            ) : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={FIELD_LABELS.name}>
                  {lead.company}
                </Descriptions.Item>
                <Descriptions.Item label={FIELD_LABELS.website}>
                  {lead.website || "-"}
                </Descriptions.Item>
                <Descriptions.Item label={FIELD_LABELS.phone}>
                  {lead.phone || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          <section>
            <Typography.Title level={5}>{ENTITY_LABELS.contact}</Typography.Title>
            <Form.Item name="contactMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Tạo mới người liên hệ</Radio>
                  <Radio value="USE_EXISTING">Dùng người liên hệ có sẵn</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {contactMode === "USE_EXISTING" ? (
              <Form.Item
                name="contactId"
                label={ENTITY_LABELS.contact}
                rules={[
                  { required: true, message: "Vui lòng chọn người liên hệ" },
                ]}
              >
                <RelatedRecordLookup relatedType="CONTACT" />
              </Form.Item>
            ) : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={FIELD_LABELS.name}>
                  {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {lead.email || "-"}
                </Descriptions.Item>
                <Descriptions.Item label={FIELD_LABELS.phone}>
                  {lead.phone || "-"}
                </Descriptions.Item>
                <Descriptions.Item label={FIELD_LABELS.title}>
                  {lead.title || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          <section>
            <Typography.Title level={5}>{ENTITY_LABELS.opportunity}</Typography.Title>
            <Form.Item name="opportunityMode">
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="CREATE_NEW">Tạo mới cơ hội bán hàng</Radio>
                  <Radio value="DO_NOT_CREATE">Không tạo cơ hội bán hàng</Radio>
                  <Radio value="USE_EXISTING">
                    Dùng cơ hội bán hàng có sẵn
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            {opportunityMode === "USE_EXISTING" && (
              <Form.Item
                name="opportunityId"
                label={ENTITY_LABELS.opportunity}
                rules={[
                  { required: true, message: "Vui lòng chọn cơ hội bán hàng" },
                ]}
              >
                <RelatedRecordLookup relatedType="OPPORTUNITY" />
              </Form.Item>
            )}
            {opportunityMode === "CREATE_NEW" && (
              <Form.Item
                name="opportunityName"
                label="Tên cơ hội bán hàng"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            )}
          </section>
        </div>

        <Divider />

        <Typography.Title level={5}>Xem trước</Typography.Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={ENTITY_LABELS.lead}>
            {[lead.firstName, lead.lastName].filter(Boolean).join(" ")} -{" "}
            {lead.company}
          </Descriptions.Item>
          <Descriptions.Item label={ENTITY_LABELS.account}>
            {accountMode === "USE_EXISTING" ? (
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={accountId}
                link
              />
            ) : (
              `Tạo "${lead.company}"`
            )}
          </Descriptions.Item>
          <Descriptions.Item label={ENTITY_LABELS.contact}>
            {contactMode === "USE_EXISTING" ? (
              <EntityReferenceDisplay
                entityType="CONTACT"
                entityId={contactId}
                link
              />
            ) : (
              `Tạo "${[lead.firstName, lead.lastName].filter(Boolean).join(" ")}"`
            )}
          </Descriptions.Item>
          <Descriptions.Item label={ENTITY_LABELS.opportunity}>
            {opportunityMode === "DO_NOT_CREATE" && "Không tạo"}
            {opportunityMode === "USE_EXISTING" && (
              <EntityReferenceDisplay
                entityType="OPPORTUNITY"
                entityId={opportunityId}
                link
              />
            )}
            {opportunityMode === "CREATE_NEW" &&
              `Tạo "${opportunityName || initialValues.opportunityName}"`}
          </Descriptions.Item>
          <Descriptions.Item label="Sao chép nguồn">
            {getSourceLabel(sourceValue(lead))} → Khách hàng / Công ty / Người
            liên hệ
            {opportunityMode === "DO_NOT_CREATE" ? "" : " / Cơ hội bán hàng"}
          </Descriptions.Item>
          <Descriptions.Item label={FIELD_LABELS.sourceDetail}>
            {lead.sourceDetail || "-"}
          </Descriptions.Item>
        </Descriptions>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Xác nhận chuyển đổi
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
