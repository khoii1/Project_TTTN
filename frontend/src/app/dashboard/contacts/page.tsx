"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Popconfirm, Input, Select, Tag, App } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { EntityReferenceDisplay } from "@/components/crm/EntityReferenceDisplay";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { SOURCE_OPTIONS, getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
} from "@/lib/constants/vi-labels";

function ContactsList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentSource = searchParams.get("source") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async (
    page: number,
    limit: number,
    search: string,
    source?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, source };
      const res = await contactsApi.getAll(payload);
      const items = getDataArray<Contact>(res);
      setContacts(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch {
      message.error("Không thể tải người liên hệ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchContacts(currentPage, currentLimit, currentSearch, currentSource);
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
    router.push(`/dashboard/contacts?${urlParams.toString()}`);
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
      await contactsApi.delete(id);
      message.success("Đã xóa người liên hệ");
      fetchContacts(currentPage, currentLimit, currentSearch, currentSource);
    } catch {
      message.error("Không thể xóa người liên hệ");
    }
  };

  const columns: TableColumnsType<Contact> = [
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
      title: FIELD_LABELS.title,
      dataIndex: "title",
      key: "title",
    },
    {
      title: FIELD_LABELS.email,
      dataIndex: "email",
      key: "email",
    },
    {
      title: FIELD_LABELS.phone,
      dataIndex: "phone",
      key: "phone",
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
            onClick={() => router.push(`/dashboard/contacts/${record.id}`)}
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
        title="Người liên hệ"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/contacts/new")}
          >
            Tạo người liên hệ
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm người liên hệ..."
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
        dataSource={contacts}
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

export default function ContactsListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <ContactsList />
    </Suspense>
  );
}
