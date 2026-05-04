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
} from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { SourceFields } from "@/components/crm/SourceFields";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { casesApi } from "@/features/cases/cases.api";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { Case } from "@/features/cases/cases.types";
import { useRouter } from "next/navigation";
import { getSourceLabel } from "@/lib/constants/source-options";
import React from "react";

type RelatedRowProps = {
  title: string;
  description?: string;
  onView: () => void;
};

const RelatedRow = ({ title, description, onView }: RelatedRowProps) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
    <div className="min-w-0">
      <div className="truncate font-medium text-gray-900">{title}</div>
      {description && (
        <div className="mt-1 truncate text-sm text-gray-500">{description}</div>
      )}
    </div>
    <Button type="link" onClick={onView}>
      View
    </Button>
  </div>
);

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

      setRelatedContacts(allContacts.filter((c) => c.accountId === id));
      setRelatedOpps(allOpps.filter((o) => o.accountId === id));
      setRelatedCases(allCases.filter((c) => c.accountId === id));
    } catch {
      message.error("Failed to load account details");
    } finally {
      setLoading(false);
    }
  }, [id]);

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
          <Form layout="vertical" initialValues={account} onFinish={handleUpdate}>
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
            <Descriptions.Item label="Owner">
              <UserReferenceDisplay userId={account.ownerId} />
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {getSourceLabel(account.source)}
            </Descriptions.Item>
            <Descriptions.Item label="Source Detail">
              {account.sourceDetail || "-"}
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
                  <div>
                    {relatedContacts.map((item) => (
                      <RelatedRow
                        key={item.id}
                        title={`${item.firstName} ${item.lastName}`}
                        description={item.email}
                        onView={() =>
                          router.push(`/dashboard/contacts/${item.id}`)
                        }
                      />
                    ))}
                  </div>
                ),
              },
              {
                key: "opportunities",
                label: `Opportunities (${relatedOpps.length})`,
                children: (
                  <div>
                    {relatedOpps.map((item) => (
                      <RelatedRow
                        key={item.id}
                        title={item.name}
                        description={`Stage: ${item.stage} | Amount: $${item.amount || 0}`}
                        onView={() =>
                          router.push(`/dashboard/opportunities/${item.id}`)
                        }
                      />
                    ))}
                  </div>
                ),
              },
              {
                key: "cases",
                label: `Cases (${relatedCases.length})`,
                children: (
                  <div>
                    {relatedCases.map((item) => (
                      <RelatedRow
                        key={item.id}
                        title={item.subject}
                        description={`Status: ${item.status}`}
                        onView={() =>
                          router.push(`/dashboard/cases/${item.id}`)
                        }
                      />
                    ))}
                  </div>
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
