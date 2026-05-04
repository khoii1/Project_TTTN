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
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import {
  Opportunity,
  OpportunityStage,
} from "@/features/opportunities/opportunities.types";
import { PageHeader } from "@/components/common/PageHeader";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";

function OpportunitiesList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStage = searchParams.get("stage") || undefined;
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(searchParams.get("limit") || "10", 10);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = async (
    page: number,
    limit: number,
    search: string,
    stage?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, stage };

      const [oppsRes, accountsData] = await Promise.all([
        opportunitiesApi.getAll(payload),
        accountsApi.getAll(), // Note: Keep this client-side or we'd need to paginate accounts separately
      ]);

      const items = getDataArray<Opportunity>(oppsRes);
      setOpportunities(items);
      setTotal(getPaginationMeta(oppsRes)?.total ?? items.length);

      // We only need to fetch accounts once ideally, but it's okay here for mapping names
      setAccounts(getDataArray(accountsData));
    } catch {
      message.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchOpportunities(
        currentPage,
        currentLimit,
        currentSearch,
        currentStage,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentStage]);

  const updateURL = (params: Record<string, string | number | undefined>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });
    router.push(`/dashboard/opportunities?${urlParams.toString()}`);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    updateURL({ page: pagination.current, limit: pagination.pageSize });
  };

  const handleSearch = (value: string) => {
    updateURL({ search: value, page: 1 });
  };

  const handleStageFilter = (value: string) => {
    updateURL({ stage: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await opportunitiesApi.delete(id);
      message.success("Opportunity deleted");
      fetchOpportunities(
        currentPage,
        currentLimit,
        currentSearch,
        currentStage,
      );
    } catch {
      message.error("Failed to delete opportunity");
    }
  };

  const stageColors: Record<string, string> = {
    QUALIFY: "blue",
    PROPOSE: "purple",
    NEGOTIATE: "orange",
    CLOSED_WON: "green",
    CLOSED_LOST: "red",
  };

  const columns: TableColumnsType<Opportunity> = [
    {
      title: "Opportunity Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Account",
      key: "account",
      render: (_, record) => {
        const acc = accounts.find((a) => a.id === record.accountId);
        return acc ? acc.name : "N/A";
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => (val ? `$${val.toLocaleString()}` : "N/A"),
    },
    {
      title: "Stage",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => (
        <Tag color={stageColors[stage] || "default"}>{stage}</Tag>
      ),
    },
    {
      title: "Close Date",
      dataIndex: "closeDate",
      key: "closeDate",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "N/A",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/opportunities/${record.id}`)}
          />
          <Popconfirm
            title="Delete this opportunity?"
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
        title="Opportunities"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/opportunities/new")}
          >
            New Opportunity
          </Button>
        }
      />
      <div className="mb-4 flex space-x-4">
        <Input.Search
          placeholder="Search opportunities..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Filter by Stage"
          allowClear
          value={currentStage}
          onChange={handleStageFilter}
          className="w-48"
        >
          {Object.values(OpportunityStage).map((s) => (
            <Select.Option key={s} value={s}>
              {s}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Table
        columns={columns}
        dataSource={opportunities}
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

export default function OpportunitiesListPage() {
  return (
    <Suspense
      fallback={<div className="p-4 text-center">Loading opportunities...</div>}
    >
      <OpportunitiesList />
    </Suspense>
  );
}
