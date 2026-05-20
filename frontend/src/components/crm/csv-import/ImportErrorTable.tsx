"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ImportCsvIssue } from "./types";

type ImportErrorTableProps = {
  errors: ImportCsvIssue[];
};

export function ImportErrorTable({ errors }: ImportErrorTableProps) {
  const columns: ColumnsType<ImportCsvIssue> = [
    {
      title: "Dòng",
      dataIndex: "row",
      key: "row",
      width: 80,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type?: string) =>
        type === "SKIPPED" ? (
          <Tag color="gold">Bỏ qua</Tag>
        ) : (
          <Tag color="red">Lỗi</Tag>
        ),
    },
    {
      title: "Cột",
      dataIndex: "field",
      key: "field",
      width: 160,
      render: (field?: string) => field || "-",
    },
    {
      title: "Nội dung",
      dataIndex: "message",
      key: "message",
    },
  ];

  if (errors.length === 0) {
    return null;
  }

  return (
    <Table
      columns={columns}
      dataSource={errors}
      rowKey={(record, index) => `${record.row}-${record.field || "row"}-${index}`}
      pagination={{ pageSize: 5 }}
      size="small"
    />
  );
}
