"use client";

import { Form, Input, Select } from "antd";
import { SOURCE_OPTIONS } from "@/lib/constants/source-options";

interface SourceFieldsProps {
  disabled?: boolean;
}

export const SourceFields = ({ disabled }: SourceFieldsProps) => (
  <div className="grid grid-cols-2 gap-4">
    <Form.Item name="source" label="Source">
      <Select
        allowClear
        disabled={disabled}
        options={[...SOURCE_OPTIONS]}
        placeholder="Select source"
      />
    </Form.Item>
    <Form.Item name="sourceDetail" label="Source Detail">
      <Input disabled={disabled} placeholder="Source details..." />
    </Form.Item>
  </div>
);
