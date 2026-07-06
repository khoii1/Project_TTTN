"use client";

import { useState } from "react";
import { Form, Input, Button, Select, App } from "antd";
import { useRouter } from "next/navigation";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead, LeadStatus } from "@/features/leads/leads.types";
import { FormPageLayout } from "@/components/common/FormPageLayout";
import { getApiErrorMessage } from "@/lib/api/error";
import { SourceFields } from "@/components/crm/SourceFields";
import { HcmWardSelect } from "@/components/crm/HcmWardSelect";
import { HCM_PROVINCE_NAME } from "@/lib/constants/hcm-wards";
import { getStatusLabel } from "@/lib/constants/vi-labels";

const { TextArea } = Input;

export default function NewLeadPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Partial<Lead>) => {
    try {
      setLoading(true);
      const { status, ...createPayload } = {
        ...values,
        provinceName: HCM_PROVINCE_NAME,
      };
      const createdLead = await leadsApi.create(createPayload);

      if (status && status !== LeadStatus.NEW) {
        await leadsApi.updateStatus(createdLead.id, status);
      }

      message.success("Tạo khách hàng tiềm năng thành công");
      router.push("/dashboard/leads");
    } catch (error: unknown) {
      message.error(
        getApiErrorMessage(error, "Không thể tạo khách hàng tiềm năng"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout title="Tạo khách hàng tiềm năng">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: LeadStatus.NEW, provinceName: HCM_PROVINCE_NAME }}
        >
          <div className="crm-form-grid">
            <Form.Item
              name="firstName"
              label="Họ"
              rules={[{ required: true }]}
            >
              <Input placeholder="Trần Quốc" />
            </Form.Item>
            <Form.Item name="lastName" label="Tên" rules={[{ required: true }]}>
              <Input placeholder="Huy" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <div className="crm-form-grid">
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="company" label="Công ty">
              <Input placeholder="Acme Inc" />
            </Form.Item>
          </div>

          <Form.Item name="status" label="Trạng thái">
            <Select>
              {Object.values(LeadStatus).map((status) => (
                <Select.Option key={status} value={status}>
                  {getStatusLabel(status)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <SourceFields />

          <div className="crm-form-grid">
            <Form.Item name="provinceName" label="Tỉnh/Thành phố">
              <Input disabled />
            </Form.Item>
            <Form.Item name="wardName" label="Phường/Xã">
              <HcmWardSelect placeholder="Gõ để tìm phường/xã" />
            </Form.Item>
          </div>

          <Form.Item name="addressDetail" label="Địa chỉ chi tiết">
            <Input placeholder="Số nhà, tên đường, tòa nhà..." maxLength={240} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả / Nhu cầu tư vấn">
            <TextArea
              rows={5}
              placeholder="Nhập nhu cầu tư vấn, ghi chú hoặc bối cảnh chăm sóc khách hàng"
            />
          </Form.Item>

          <div className="crm-form-actions">
            <Button onClick={() => router.back()}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu khách hàng tiềm năng
            </Button>
          </div>
        </Form>
    </FormPageLayout>
  );
}
