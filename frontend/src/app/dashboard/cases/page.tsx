"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Tag, Popconfirm, Select, Input, App } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { PageHeader } from "@/components/common/PageHeader";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { SOURCE_OPTIONS, getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

function CasesList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || undefined;
  const currentPriority = searchParams.get("priority") || undefined;
  const currentSource = searchParams.get("source") || undefined;
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
    source?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, status, priority, source };
      const res = await casesApi.getAll(payload);
      const items = getDataArray<Case>(res);
      setCases(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Không thể tải yêu cầu hỗ trợ");
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
        currentSource,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    currentPage,
    currentLimit,
    currentSearch,
    currentStatus,
    currentPriority,
    currentSource,
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

  const handleSourceFilter = (value?: string) => {
    updateURL({ source: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await casesApi.delete(id);
      message.success("Đã xóa yêu cầu hỗ trợ");
      fetchCases(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
        currentSource,
      );
    } catch {
      message.error("Không thể xóa yêu cầu hỗ trợ");
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
      title: FIELD_LABELS.subject,
      dataIndex: "subject",
      key: "subject",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: FIELD_LABELS.status,
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColors[status]}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: FIELD_LABELS.priority,
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag color={priorityColors[priority]}>{getPriorityLabel(priority)}</Tag>
      ),
    },
    {
      title: FIELD_LABELS.account,
      dataIndex: "accountId",
      key: "accountId",
      render: (accountId?: string) => (
        <EntityReferenceDisplay
          entityType="ACCOUNT"
          entityId={accountId}
          link
        />
      ),
    },
    {
      title: FIELD_LABELS.contact,
      dataIndex: "contactId",
      key: "contactId",
      render: (contactId?: string) => (
        <EntityReferenceDisplay
          entityType="CONTACT"
          entityId={contactId}
          link
        />
      ),
    },
    {
      title: FIELD_LABELS.source,
      dataIndex: "source",
      key: "source",
      render: (source?: string) => <Tag>{getSourceLabel(source)}</Tag>,
    },
    {
      title: FIELD_LABELS.owner,
      dataIndex: "ownerId",
      key: "ownerId",
      render: (ownerId?: string) => <UserReferenceDisplay userId={ownerId} />,
    },
    {
      title: FIELD_LABELS.createdAt,
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/cases/${record.id}`)}
          />
          <Popconfirm
            title={FEEDBACK_LABELS.deleteConfirm}
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
        title="Yêu cầu hỗ trợ"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/cases/new")}
          >
            Tạo yêu cầu hỗ trợ
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm yêu cầu hỗ trợ..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Lọc theo trạng thái"
          onChange={handleStatusFilter}
          value={currentStatus}
          allowClear
          style={{ width: 200 }}
        >
          <Select.Option value="NEW">Mới</Select.Option>
          <Select.Option value="WORKING">Đang xử lý</Select.Option>
          <Select.Option value="RESOLVED">Đã giải quyết</Select.Option>
          <Select.Option value="CLOSED">Đã đóng</Select.Option>
        </Select>

        <Select
          placeholder="Lọc theo mức ưu tiên"
          onChange={handlePriorityFilter}
          value={currentPriority}
          allowClear
          style={{ width: 200 }}
        >
          <Select.Option value="LOW">Thấp</Select.Option>
          <Select.Option value="MEDIUM">Trung bình</Select.Option>
          <Select.Option value="HIGH">Cao</Select.Option>
          <Select.Option value="URGENT">Khẩn cấp</Select.Option>
        </Select>
        <Select
          placeholder="Tất cả nguồn"
          allowClear
          value={currentSource}
          onChange={handleSourceFilter}
          style={{ width: 208 }}
          options={[...SOURCE_OPTIONS]}
        />
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
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <CasesList />
    </Suspense>
  );
}
