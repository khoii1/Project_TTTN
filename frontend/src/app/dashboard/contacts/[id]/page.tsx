"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Spin,
  message,
  Button,
  Form,
  Input,
  Select,
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { SourceFields } from "@/components/crm/SourceFields";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { contactsApi } from "@/features/contacts/contacts.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { getSourceLabel } from "@/lib/constants/source-options";
import React from "react";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [contact, setContact] = useState<Contact | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contactsApi.getById(id);
      setContact(data);
    } catch {
      message.error("Failed to load contact details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchContact();
      accountsApi.getAll().then(setAccounts).catch(console.error);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchContact]);

  const handleUpdate = async (values: Partial<Contact>) => {
    try {
      setSaving(true);
      const updatePayload = { ...values };
      delete updatePayload.accountId;
      await contactsApi.update(id, updatePayload);
      message.success("Contact updated");
      setIsEditing(false);
      fetchContact();
    } catch {
      message.error("Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <Spin size="large" />
      </div>
    );
  if (!contact) return <div>Contact not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        subtitle={contact.title}
        showBack
        action={
          !isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>
        }
      />

      <Card className="shadow-sm">
        {isEditing ? (
          <Form layout="vertical" initialValues={contact} onFinish={handleUpdate}>
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
              <Form.Item name="title" label="Title">
                <Input />
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
            <Descriptions.Item label="First Name">
              {contact.firstName}
            </Descriptions.Item>
            <Descriptions.Item label="Last Name">
              {contact.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Title">
              {contact.title || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">{contact.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">
              {contact.phone || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Account">
              <EntityReferenceDisplay
                entityType="ACCOUNT"
                entityId={contact.accountId}
                link
              />
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={contact.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {getSourceLabel(contact.source)}
            </Descriptions.Item>
            <Descriptions.Item label="Source Detail">
              {contact.sourceDetail || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(contact.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(contact.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <ActivityTimeline relatedType="CONTACT" relatedId={id} />
    </div>
  );
}
