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
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task } from "@/features/tasks/tasks.types";
import { PageHeader } from "@/components/common/PageHeader";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import type { EntityReferenceType } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function TasksList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || undefined;
  const currentPriority = searchParams.get("priority") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (
    page: number,
    limit: number,
    search: string,
    status?: string,
    priority?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, status, priority };
      const res = await tasksApi.getAll(payload);

      const items = getDataArray<Task>(res);
      setTasks(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTasks(
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
    router.push(`/dashboard/tasks?${urlParams.toString()}`);
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
      await tasksApi.delete(id);
      message.success("Task deleted");
      fetchTasks(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    } catch {
      message.error("Failed to delete task");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await tasksApi.complete(id);
      message.success("Task marked as completed");
      fetchTasks(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    } catch {
      message.error("Failed to complete task");
    }
  };

  const statusColors: Record<string, string> = {
    NOT_STARTED: "default",
    IN_PROGRESS: "blue",
    COMPLETED: "green",
    CANCELLED: "red",
  };

  const priorityColors: Record<string, string> = {
    LOW: "default",
    NORMAL: "blue",
    HIGH: "red",
  };

  const columns: TableColumnsType<Task> = [
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (text: string, record: Task) => (
        <span
          className={`font-medium ${record.status === "COMPLETED" ? "line-through text-gray-400" : ""}`}
        >
          {text}
        </span>
      ),
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
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "N/A",
    },
    {
      title: "Related To",
      key: "relatedTo",
      render: (_, record) =>
        record.relatedType && record.relatedId ? (
          <EntityReferenceDisplay
            entityType={record.relatedType as EntityReferenceType}
            entityId={record.relatedId}
            link
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Assigned To",
      dataIndex: "assignedToId",
      key: "assignedToId",
      render: (assignedToId?: string) => (
        <UserReferenceDisplay userId={assignedToId} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          {record.status !== "COMPLETED" && (
            <Button
              type="text"
              icon={<CheckOutlined className="text-green-500" />}
              onClick={() => handleComplete(record.id)}
            />
          )}
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/tasks/${record.id}`)}
          />
          <Popconfirm
            title="Delete this task?"
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
        title="Tasks"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/tasks/new")}
          >
            New Task
          </Button>
        }
      />
      <div className="mb-4 flex space-x-4">
        <Input.Search
          placeholder="Search tasks..."
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
          className="w-48"
        >
          <Select.Option value="NOT_STARTED">Not Started</Select.Option>
          <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
          <Select.Option value="COMPLETED">Completed</Select.Option>
          <Select.Option value="CANCELLED">Cancelled</Select.Option>
        </Select>
        <Select
          placeholder="Filter by Priority"
          onChange={handlePriorityFilter}
          value={currentPriority}
          allowClear
          className="w-48"
        >
          <Select.Option value="LOW">Low</Select.Option>
          <Select.Option value="NORMAL">Normal</Select.Option>
          <Select.Option value="HIGH">High</Select.Option>
        </Select>
      </div>
      <Table
        columns={columns}
        dataSource={tasks}
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

export default function TasksListPage() {
  return (
    <Suspense
      fallback={<div className="p-4 text-center">Loading tasks...</div>}
    >
      <TasksList />
    </Suspense>
  );
}
