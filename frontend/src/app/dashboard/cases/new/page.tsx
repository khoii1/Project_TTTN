"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Card, message, Select } from "antd";
import { useRouter } from "next/navigation";
import { casesApi } from "@/features/cases/cases.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Case } from "@/features/cases/cases.types";
import { CaseStatus, CasePriority } from "@/features/cases/cases.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(console.error);
    contactsApi.getAll().then(setContacts).catch(console.error);
  }, []);

  const onFinish = async (values: Partial<Case>) => {
    try {
      setLoading(true);
      await casesApi.create({
        ...values,
        status: values.status || CaseStatus.NEW,
        priority: values.priority || CasePriority.MEDIUM,
      });
      message.success("Case created successfully");
      router.push("/dashboard/cases");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to create case"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Case" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            status: CaseStatus.NEW,
            priority: CasePriority.MEDIUM,
          }}
        >
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true }]}
          >
            <Input placeholder="Login issue" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} placeholder="User is unable to login..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="accountId" label="Account (Optional)">
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
            <Form.Item name="contactId" label="Contact (Optional)">
              <Select
                placeholder="Select a Contact"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {contacts.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="status" label="Status">
              <Select>
                {Object.values(CaseStatus).map((s) => (
                  <Select.Option key={s} value={s}>
                    {s}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select>
                {Object.values(CasePriority).map((p) => (
                  <Select.Option key={p} value={p}>
                    {p}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Case
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
