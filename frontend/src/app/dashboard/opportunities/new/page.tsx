"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Select,
  InputNumber,
  DatePicker,
  App,
  Space,
} from "antd";
import { useRouter } from "next/navigation";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import {
  Opportunity,
  OpportunityStage,
} from "@/features/opportunities/opportunities.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";
import { getStatusLabel } from "@/lib/constants/vi-labels";

export default function NewOpportunityPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(console.error);
    contactsApi.getAll().then(setContacts).catch(console.error);
  }, []);

  const onFinish = async (values: Partial<Opportunity>) => {
    try {
      setLoading(true);
      const { stage, closeDate, ...restValues } = values;
      const createdOpportunity = await opportunitiesApi.create({
        ...restValues,
        closeDate: closeDate
          ? new Date(closeDate as string).toISOString()
          : undefined,
      });

      if (stage && stage !== OpportunityStage.QUALIFY) {
        await opportunitiesApi.updateStage(createdOpportunity.id, stage);
      }

      message.success("Tạo cơ hội bán hàng thành công");
      router.push("/dashboard/opportunities");
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tạo cơ hội bán hàng"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tạo cơ hội bán hàng" showBack />
      <Card className="max-w-2xl shadow-sm">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ stage: OpportunityStage.QUALIFY }}
        >
          <Form.Item
            name="name"
            label="Tên cơ hội bán hàng"
            rules={[{ required: true }]}
          >
            <Input placeholder="100 Laptops deal" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Giá trị">
              <Space.Compact className="w-full">
                <Form.Item name="amount" noStyle>
                  <InputNumber
                    className="w-full"
                    placeholder="Nhập giá trị cơ hội"
                  />
                </Form.Item>
                <Button disabled>VNĐ</Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="closeDate" label="Ngày chốt dự kiến">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="accountId"
              label="Khách hàng / Công ty"
              rules={[{ required: true }]}
            >
              <Select
                placeholder="Chọn khách hàng / công ty"
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

          <Form.Item name="stage" label="Giai đoạn">
            <Select>
              {Object.values(OpportunityStage).map((stage) => (
                <Select.Option key={stage} value={stage}>
                  {getStatusLabel(stage)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <SourceFields />

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu cơ hội bán hàng
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
