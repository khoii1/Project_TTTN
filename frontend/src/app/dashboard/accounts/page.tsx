"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Popconfirm, Input, Select, Tag, App } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { SOURCE_OPTIONS, getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
} from "@/lib/constants/vi-labels";

function AccountsList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentSource = searchParams.get("source") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async (
    page: number,
    limit: number,
    search: string,
    source?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, source };
      const res = await accountsApi.getAll(payload);
      const items = getDataArray<Account>(res);
      setAccounts(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Không thể tải khách hàng / công ty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAccounts(currentPage, currentLimit, currentSearch, currentSource);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentSource]);

  const updateURL = (params: Record<string, string | number | undefined>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });
    router.push(`/dashboard/accounts?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleSourceFilter = (value?: string) => {
    updateURL({ source: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await accountsApi.delete(id);
      message.success("Đã xóa khách hàng / công ty");
      fetchAccounts(currentPage, currentLimit, currentSearch, currentSource);
    } catch {
      message.error("Không thể xóa khách hàng / công ty");
    }
  };

  const columns: TableColumnsType<Account> = [
    {
      title: "Tên khách hàng / công ty",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: FIELD_LABELS.type,
      dataIndex: "type",
      key: "type",
    },
    {
      title: FIELD_LABELS.website,
      dataIndex: "website",
      key: "website",
      render: (text: string) =>
        text ? (
          <a
            href={text.startsWith("http") ? text : `https://${text}`}
            target="_blank"
            rel="noreferrer"
          >
            {text}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: FIELD_LABELS.phone,
      dataIndex: "phone",
      key: "phone",
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
            onClick={() => router.push(`/dashboard/accounts/${record.id}`)}
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
        title="Khách hàng / Công ty"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/accounts/new")}
          >
            Tạo khách hàng / công ty
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm khách hàng / công ty..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
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
        dataSource={accounts}
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

export default function AccountsListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <AccountsList />
    </Suspense>
  );
}
