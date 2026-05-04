"use client";

import { useEffect, useState, Suspense } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Input,
  Select,
} from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead, LeadStatus } from "@/features/leads/leads.types";
import { PageHeader } from "@/components/common/PageHeader";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { getSourceLabel } from "@/lib/constants/source-options";

function LeadsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || undefined;
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
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, status };
      const res = await leadsApi.getAll(payload);
      const items = getDataArray<Lead>(res);
      setLeads(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLeads(currentPage, currentLimit, currentSearch, currentStatus);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentStatus]);

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

  const handleDelete = async (id: string) => {
    try {
      await leadsApi.delete(id);
      message.success("Lead deleted");
      fetchLeads(currentPage, currentLimit, currentSearch, currentStatus);
    } catch {
      message.error("Failed to delete lead");
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
      title: "Name",
      key: "name",
      render: (_, record) => (
        <span className="font-medium">
          {record.firstName} {record.lastName}
        </span>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Company",
      dataIndex: "company",
      key: "company",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (source?: string) => getSourceLabel(source),
    },
    {
      title: "Owner",
      dataIndex: "ownerId",
      key: "ownerId",
      render: (ownerId?: string) => <UserReferenceDisplay userId={ownerId} />,
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
            onClick={() => router.push(`/dashboard/leads/${record.id}`)}
          />
          <Popconfirm
            title="Delete this lead?"
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
        title="Leads"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/leads/new")}
          >
            New Lead
          </Button>
        }
      />
      <div className="mb-4 flex space-x-4">
        <Input.Search
          placeholder="Search leads..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          value={currentStatus}
          onChange={handleStatusFilter}
          className="w-48"
        >
          {Object.values(LeadStatus).map((s) => (
            <Select.Option key={s} value={s}>
              {s}
            </Select.Option>
          ))}
        </Select>
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
      fallback={<div className="p-4 text-center">Loading leads...</div>}
    >
      <LeadsList />
    </Suspense>
  );
}
