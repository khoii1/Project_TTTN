"use client";

import { Form, Input, Select } from "antd";
import { SOURCE_OPTIONS } from "@/lib/constants/source-options";
import { FIELD_LABELS } from "@/lib/constants/vi-labels";

interface SourceFieldsProps {
  disabled?: boolean;
}

export const SourceFields = ({ disabled }: SourceFieldsProps) => (
  <div className="grid grid-cols-2 gap-4">
    <Form.Item name="source" label={FIELD_LABELS.source}>
      <Select
        allowClear
        disabled={disabled}
        options={[...SOURCE_OPTIONS]}
        placeholder="Chọn nguồn"
      />
    </Form.Item>
    <Form.Item name="sourceDetail" label={FIELD_LABELS.sourceDetail}>
      <Input disabled={disabled} placeholder="Nhập chi tiết nguồn..." />
    </Form.Item>
  </div>
);
