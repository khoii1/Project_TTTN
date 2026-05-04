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
  Tabs,
  List,
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { casesApi } from "@/features/cases/cases.api";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { Case } from "@/features/cases/cases.types";
import { useRouter } from "next/navigation";
import React from "react";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const [account, setAccount] = useState<Account | null>(null);
  const [relatedContacts, setRelatedContacts] = useState<Contact[]>([]);
  const [relatedOpps, setRelatedOpps] = useState<Opportunity[]>([]);
  const [relatedCases, setRelatedCases] = useState<Case[]>([]);

  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accData, allContacts, allOpps, allCases] = await Promise.all([
        accountsApi.getById(id),
        contactsApi.getAll(),
        opportunitiesApi.getAll(),
        casesApi.getAll(),
      ]);
      setAccount(accData);
      form.setFieldsValue(accData);

      setRelatedContacts(allContacts.filter((c) => c.accountId === id));
      setRelatedOpps(allOpps.filter((o) => o.accountId === id));
      setRelatedCases(allCases.filter((c) => c.accountId === id));
    } catch {
      message.error("Failed to load account details");
    } finally {
      setLoading(false);
    }
  }, [form, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const handleUpdate = async (values: Partial<Account>) => {
    try {
      setSaving(true);
      await accountsApi.update(id, values);
      message.success("Account updated");
      setIsEditing(false);
      fetchData();
    } catch {
      message.error("Failed to update account");
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
  if (!account) return <div>Account not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        subtitle={account.type}
        showBack
        action={
          !isEditing && <Button onClick={() => setIsEditing(true)}>Edit</Button>
        }
      />

      <Card className="shadow-sm">
        {isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item
              name="name"
              label="Account Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="website" label="Website">
                <Input />
              </Form.Item>
              <Form.Item name="type" label="Type">
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="Phone">
                <Input />
              </Form.Item>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </Form>
        ) : (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="Account Name">
              {account.name}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {account.type || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Website">
              {account.website || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {account.phone || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(account.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(account.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm h-fit">
          <Tabs
            defaultActiveKey="contacts"
            items={[
              {
                key: "contacts",
                label: `Contacts (${relatedContacts.length})`,
                children: (
                  <List
                    size="small"
                    dataSource={relatedContacts}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            key={`contact-view-${item.id}`}
                            type="link"
                            onClick={() =>
                              router.push(`/dashboard/contacts/${item.id}`)
                            }
                          >
                            View
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={`${item.firstName} ${item.lastName}`}
                          description={item.email}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: "opportunities",
                label: `Opportunities (${relatedOpps.length})`,
                children: (
                  <List
                    size="small"
                    dataSource={relatedOpps}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            key={`opportunity-view-${item.id}`}
                            type="link"
                            onClick={() =>
                              router.push(`/dashboard/opportunities/${item.id}`)
                            }
                          >
                            View
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.name}
                          description={`Stage: ${item.stage} | Amount: $${item.amount || 0}`}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: "cases",
                label: `Cases (${relatedCases.length})`,
                children: (
                  <List
                    size="small"
                    dataSource={relatedCases}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            key={`case-view-${item.id}`}
                            type="link"
                            onClick={() =>
                              router.push(`/dashboard/cases/${item.id}`)
                            }
                          >
                            View
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.subject}
                          description={`Status: ${item.status}`}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </Card>

        <ActivityTimeline relatedType="ACCOUNT" relatedId={id} />
      </div>
    </div>
  );
}
