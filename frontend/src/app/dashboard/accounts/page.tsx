"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Popconfirm, message, Input } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function AccountsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async (page: number, limit: number, search: string) => {
    try {
      setLoading(true);
      const payload = { page, limit, search };
      const res = await accountsApi.getAll(payload);
      const items = getDataArray<Account>(res);
      setAccounts(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch (error) {
      message.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(currentPage, currentLimit, currentSearch);
  }, [currentPage, currentLimit, currentSearch]);

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

  const handleTableChange = (pagination: any) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await accountsApi.delete(id);
      message.success("Account deleted");
      fetchAccounts(currentPage, currentLimit, currentSearch);
    } catch (error) {
      message.error("Failed to delete account");
    }
  };

  const columns = [
    {
      title: "Account Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Website",
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
          "N/A"
        ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
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
      render: (_: any, record: Account) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/accounts/${record.id}`)}
          />
          <Popconfirm
            title="Delete this account?"
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
        title="Accounts"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/accounts/new")}
          >
            New Account
          </Button>
        }
      />
      <div className="mb-4 w-64">
        <Input.Search
          placeholder="Search accounts..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
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
      fallback={<div className="p-4 text-center">Loading accounts...</div>}
    >
      <AccountsList />
    </Suspense>
  );
}
