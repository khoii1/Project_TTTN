"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Card, Select, App } from "antd";
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
import { SourceFields } from "@/components/crm/SourceFields";
import { getPriorityLabel, getStatusLabel } from "@/lib/constants/vi-labels";

export default function NewCasePage() {
  const { message } = App.useApp();
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
      const { status, ...createPayload } = values;
      const createdCase = await casesApi.create({
        ...createPayload,
        priority: values.priority || CasePriority.MEDIUM,
      });

      if (status && status !== CaseStatus.NEW) {
        await casesApi.updateStatus(createdCase.id, status);
      }

      message.success("Tạo yêu cầu hỗ trợ thành công");
      router.push("/dashboard/cases");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tạo yêu cầu hỗ trợ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tạo yêu cầu hỗ trợ" showBack />
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
            label="Tiêu đề"
            rules={[{ required: true }]}
          >
            <Input placeholder="Login issue" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              rows={4}
              placeholder="Người dùng không thể đăng nhập..."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="accountId"
              label="Khách hàng / Công ty (không bắt buộc)"
            >
              <Select
                placeholder="Chọn khách hàng / công ty"
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
            <Form.Item name="contactId" label="Người liên hệ (không bắt buộc)">
              <Select
                placeholder="Chọn người liên hệ"
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
            <Form.Item name="status" label="Trạng thái">
              <Select>
                {Object.values(CaseStatus).map((s) => (
                  <Select.Option key={s} value={s}>
                    {getStatusLabel(s)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Mức độ ưu tiên">
              <Select>
                {Object.values(CasePriority).map((p) => (
                  <Select.Option key={p} value={p}>
                    {getPriorityLabel(p)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <SourceFields />

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu yêu cầu hỗ trợ
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
