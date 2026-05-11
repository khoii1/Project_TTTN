"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Tag, Popconfirm, Input, Select, App } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { usersApi } from "@/features/users/users.api";
import { User, UserRole } from "@/features/auth/auth.types";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/features/auth/auth.store";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getRoleLabel,
} from "@/lib/constants/vi-labels";

function UsersList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuthStore();

  const currentSearch = searchParams.get("search") || "";
  const currentRole = searchParams.get("role") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (
    page: number,
    limit: number,
    search: string,
    role?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, role };
      const res = await usersApi.getAll(payload);
      const items = getDataArray<User>(res);
      setUsers(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Không thể tải người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchUsers(currentPage, currentLimit, currentSearch, currentRole);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentRole]);

  const updateURL = (params: Record<string, string | number | undefined>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });
    router.push(`/dashboard/users?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleRoleFilter = (value: string) => {
    updateURL({ role: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      message.success("Đã xóa người dùng");
      fetchUsers(currentPage, currentLimit, currentSearch, currentRole);
    } catch {
      message.error("Không thể xóa người dùng");
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: "red",
    MANAGER: "purple",
    SALES: "blue",
    SUPPORT: "cyan",
  };

  const columns: TableColumnsType<User> = [
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
      title: FIELD_LABELS.role,
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={roleColors[role]}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: FIELD_LABELS.createdAt,
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  if (currentUser?.role === "ADMIN") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          {record.id !== currentUser.id && (
            <Popconfirm
              title={FEEDBACK_LABELS.deleteConfirm}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Người dùng"
        action={
          currentUser?.role === "ADMIN" ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/dashboard/users/new")}
            >
              Tạo người dùng
            </Button>
          ) : null
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm người dùng..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Lọc theo vai trò"
          allowClear
          value={currentRole}
          onChange={handleRoleFilter}
          className="w-48"
        >
          {Object.values(UserRole).map((s) => (
            <Select.Option key={s} value={s}>
              {getRoleLabel(s)}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Table
        columns={columns}
        dataSource={users}
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

export default function UsersListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <UsersList />
    </Suspense>
  );
}
