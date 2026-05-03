"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Popconfirm, message, Input } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function ContactsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async (page: number, limit: number, search: string) => {
    try {
      setLoading(true);
      const payload = { page, limit, search };
      const res = await contactsApi.getAll(payload);
      const items = getDataArray<Contact>(res);
      setContacts(items);
      setTotal(getPaginationMeta(res)?.total ?? items.length);
    } catch (error) {
      message.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(currentPage, currentLimit, currentSearch);
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
    router.push(`/dashboard/contacts?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: any) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await contactsApi.delete(id);
      message.success("Contact deleted");
      fetchContacts(currentPage, currentLimit, currentSearch);
    } catch (error) {
      message.error("Failed to delete contact");
    }
  };

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_: any, record: Contact) => (
        <span className="font-medium">
          {record.firstName} {record.lastName}
        </span>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
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
      render: (_: any, record: Contact) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/contacts/${record.id}`)}
          />
          <Popconfirm
            title="Delete this contact?"
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
        title="Contacts"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/contacts/new")}
          >
            New Contact
          </Button>
        }
      />
      <div className="mb-4 w-64">
        <Input.Search
          placeholder="Search contacts..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
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
      fallback={<div className="p-4 text-center">Loading contacts...</div>}
    >
      <ContactsList />
    </Suspense>
  );
}
