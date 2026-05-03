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
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { usersApi } from "@/features/users/users.api";
import { User, UserRole } from "@/features/auth/auth.types";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/features/auth/auth.store";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function UsersList() {
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
    } catch (error) {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, currentLimit, currentSearch, currentRole);
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

  const handleTableChange = (pagination: any) => {
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
      message.success("User deleted");
      fetchUsers(currentPage, currentLimit, currentSearch, currentRole);
    } catch (error) {
      message.error("Failed to delete user");
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: "red",
    MANAGER: "purple",
    SALES: "blue",
    SUPPORT: "cyan",
  };

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_: any, record: User) => (
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
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => <Tag color={roleColors[role]}>{role}</Tag>,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  if (currentUser?.role === "ADMIN") {
    columns.push({
      title: "Actions",
      key: "actions",
      render: (_: any, record: User) => (
        <Space size="middle">
          {record.id !== currentUser.id && (
            <Popconfirm
              title="Delete this user?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    } as any);
  }

  return (
    <div>
      <PageHeader
        title="Users"
        action={
          currentUser?.role === "ADMIN" ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/dashboard/users/new")}
            >
              New User
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex space-x-4">
        <Input.Search
          placeholder="Search users..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Filter by Role"
          allowClear
          value={currentRole}
          onChange={handleRoleFilter}
          className="w-48"
        >
          {Object.values(UserRole).map((s) => (
            <Select.Option key={s} value={s}>
              {s}
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
      fallback={<div className="p-4 text-center">Loading users...</div>}
    >
      <UsersList />
    </Suspense>
  );
}
