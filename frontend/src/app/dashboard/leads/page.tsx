"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Tag, Popconfirm, Input, Select, App } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead, LeadStatus } from "@/features/leads/leads.types";
import { PageHeader } from "@/components/common/PageHeader";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { SOURCE_OPTIONS, getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

function LeadsList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || undefined;
  const currentSource = searchParams.get("source") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async (
    page: number,
    limit: number,
    search: string,
    status?: string,
    source?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, status, source };
      const res = await leadsApi.getAll(payload);
      const items = getDataArray<Lead>(res);
      setLeads(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Không thể tải khách hàng tiềm năng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLeads(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentSource,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentStatus, currentSource]);

  const updateURL = (params: Record<string, string | number | undefined>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });
    router.push(`/dashboard/leads?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 }); // reset to page 1 on search
  };

  const handleStatusFilter = (value: string) => {
    updateURL({ status: value, page: 1 });
  };

  const handleSourceFilter = (value?: string) => {
    updateURL({ source: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await leadsApi.delete(id);
      message.success("Đã xóa khách hàng tiềm năng");
      fetchLeads(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentSource,
      );
    } catch {
      message.error("Không thể xóa khách hàng tiềm năng");
    }
  };

  const statusColors: Record<string, string> = {
    NEW: "blue",
    CONTACTED: "cyan",
    NURTURING: "purple",
    QUALIFIED: "green",
    UNQUALIFIED: "red",
    CONVERTED: "gold",
  };

  const columns: TableColumnsType<Lead> = [
    {
      title: FIELD_LABELS.name,
      key: "name",
      render: (_, record) => (
        <span className="font-medium">
          {record.firstName} {record.lastName}
        </span>
      ),
    },
    {
      title: FIELD_LABELS.email,
      dataIndex: "email",
      key: "email",
    },
    {
      title: FIELD_LABELS.company,
      dataIndex: "company",
      key: "company",
    },
    {
      title: FIELD_LABELS.status,
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"}>
          {getStatusLabel(status)}
        </Tag>
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
            onClick={() => router.push(`/dashboard/leads/${record.id}`)}
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
        title="Khách hàng tiềm năng"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/leads/new")}
          >
            Tạo khách hàng tiềm năng
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm khách hàng tiềm năng..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Lọc theo trạng thái"
          allowClear
          value={currentStatus}
          onChange={handleStatusFilter}
          className="w-48"
        >
          {Object.values(LeadStatus).map((s) => (
            <Select.Option key={s} value={s}>
              {getStatusLabel(s)}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Tất cả nguồn"
          allowClear
          value={currentSource}
          onChange={handleSourceFilter}
          className="w-52"
          options={[...SOURCE_OPTIONS]}
        />
      </div>
      <Table
        columns={columns}
        dataSource={leads}
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

export default function LeadsListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <LeadsList />
    </Suspense>
  );
}
