"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Tag, Popconfirm, Select, Input, App } from "antd";
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
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

function TasksList() {
  const { message } = App.useApp();
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
      message.error("Không thể tải công việc");
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
      message.success("Đã xóa công việc");
      fetchTasks(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    } catch {
      message.error("Không thể xóa công việc");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await tasksApi.complete(id);
      message.success("Đã đánh dấu hoàn thành");
      fetchTasks(
        currentPage,
        currentLimit,
        currentSearch,
        currentStatus,
        currentPriority,
      );
    } catch {
      message.error("Không thể hoàn thành công việc");
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
      title: FIELD_LABELS.subject,
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
      title: FIELD_LABELS.dueDate,
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: FIELD_LABELS.relatedTo,
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
      title: FIELD_LABELS.assignedTo,
      dataIndex: "assignedToId",
      key: "assignedToId",
      render: (assignedToId?: string) => (
        <UserReferenceDisplay userId={assignedToId} />
      ),
    },
    {
      title: "Thao tác",
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
        title="Công việc"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/tasks/new")}
          >
            Tạo công việc
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm công việc..."
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
          className="w-48"
        >
          <Select.Option value="NOT_STARTED">Chưa bắt đầu</Select.Option>
          <Select.Option value="IN_PROGRESS">Đang thực hiện</Select.Option>
          <Select.Option value="COMPLETED">Hoàn thành</Select.Option>
          <Select.Option value="CANCELLED">Đã hủy</Select.Option>
        </Select>
        <Select
          placeholder="Lọc theo mức ưu tiên"
          onChange={handlePriorityFilter}
          value={currentPriority}
          allowClear
          className="w-48"
        >
          <Select.Option value="LOW">Thấp</Select.Option>
          <Select.Option value="NORMAL">Bình thường</Select.Option>
          <Select.Option value="HIGH">Cao</Select.Option>
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
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <TasksList />
    </Suspense>
  );
}
