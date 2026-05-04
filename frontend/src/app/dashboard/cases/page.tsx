"use client";

import { useEffect, useState, Suspense } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Select,
  Input,
} from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function CasesList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || undefined;
  const currentPriority = searchParams.get("priority") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCases = async (
    page: number,
    limit: number,
    search: string,
    status?: string,
    priority?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, status, priority };
      const res = await casesApi.getAll(payload);
      const items = getDataArray<Case>(res);
      setCases(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCases(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    currentPage,
    currentLimit,
    currentSearch,
    currentStatus,
    currentPriority,
  ]);

  const updateURL = (params: Record<string, string | number | undefined>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });
    router.push(`/dashboard/cases?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    updateURL({ status: value, page: 1 });
  };

  const handlePriorityFilter = (value: string) => {
    updateURL({ priority: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await casesApi.delete(id);
      message.success("Case deleted");
      fetchCases(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    } catch {
      message.error("Failed to delete case");
    }
  };

  const statusColors: Record<string, string> = {
    NEW: "blue",
    WORKING: "cyan",
    RESOLVED: "green",
    CLOSED: "default",
  };

  const priorityColors: Record<string, string> = {
    LOW: "default",
    MEDIUM: "blue",
    HIGH: "orange",
    URGENT: "red",
  };

  const columns: TableColumnsType<Case> = [
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag color={priorityColors[priority]}>{priority}</Tag>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/cases/${record.id}`)}
          />
          <Popconfirm
            title="Delete this case?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cases"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/cases/new")}
          >
            New Case
          </Button>
        }
      />
      <div className="mb-4 flex space-x-4">
        <Input.Search
          placeholder="Search cases..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Filter by Status"
          onChange={handleStatusFilter}
          value={currentStatus}
          allowClear
          style={{ width: 200 }}
        >
          <Select.Option value="NEW">New</Select.Option>
          <Select.Option value="WORKING">Working</Select.Option>
          <Select.Option value="RESOLVED">Resolved</Select.Option>
          <Select.Option value="CLOSED">Closed</Select.Option>
        </Select>

        <Select
          placeholder="Filter by Priority"
          onChange={handlePriorityFilter}
          value={currentPriority}
          allowClear
          style={{ width: 200 }}
        >
          <Select.Option value="LOW">Low</Select.Option>
          <Select.Option value="MEDIUM">Medium</Select.Option>
          <Select.Option value="HIGH">High</Select.Option>
          <Select.Option value="URGENT">Urgent</Select.Option>
        </Select>
      </div>
      <Table
        columns={columns}
        dataSource={cases}
        rowKey="id"
        loading={loading}
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize: currentLimit,
          total: total,
          showSizeChanger: true,
        }}
        className="shadow-sm bg-white rounded-lg"
      />
    </div>
  );
}

export default function CasesListPage() {
  return (
    <Suspense
      fallback={<div className="p-4 text-center">Loading cases...</div>}
    >
      <CasesList />
    </Suspense>
  );
}
