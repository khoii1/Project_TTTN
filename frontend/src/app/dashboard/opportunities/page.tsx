"use client";

import { useEffect, useState, Suspense } from "react";
import { Table, Button, Space, Tag, Popconfirm, Input, Select, App } from "antd";
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
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray, getPaginationMeta } from "@/lib/api/pagination";
import { SOURCE_OPTIONS, getSourceLabel } from "@/lib/constants/source-options";
import {
  EMPTY_STATE_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
  getStatusLabel,
} from "@/lib/constants/vi-labels";
import { formatVndAmount } from "@/lib/utils/currency";

function OpportunitiesList() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStage = searchParams.get("stage") || undefined;
  const currentSource = searchParams.get("source") || undefined;
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
    source?: string,
  ) => {
    try {
      setLoading(true);
      const payload = { page, limit, search, stage, source };

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
      message.error("Không thể tải cơ hội bán hàng");
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
        currentSource,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentPage, currentLimit, currentSearch, currentStage, currentSource]);

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

  const handleSourceFilter = (value?: string) => {
    updateURL({ source: value, page: 1 });
  };

  const handleDelete = async (id: string) => {
    try {
      await opportunitiesApi.delete(id);
      message.success("Đã xóa cơ hội bán hàng");
      fetchOpportunities(
        currentPage,
        currentLimit,
        currentSearch,
        currentStage,
        currentSource,
      );
    } catch {
      message.error("Không thể xóa cơ hội bán hàng");
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
      title: "Tên cơ hội bán hàng",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: FIELD_LABELS.account,
      key: "account",
      render: (_, record) => {
        const acc = accounts.find((a) => a.id === record.accountId);
        return acc ? acc.name : "-";
      },
    },
    {
      title: FIELD_LABELS.amount,
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => formatVndAmount(val),
    },
    {
      title: FIELD_LABELS.stage,
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => (
        <Tag color={stageColors[stage] || "default"}>
          {getStatusLabel(stage)}
        </Tag>
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
      title: FIELD_LABELS.closeDate,
      dataIndex: "closeDate",
      key: "closeDate",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/opportunities/${record.id}`)}
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
        title="Cơ hội bán hàng"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/opportunities/new")}
          >
            Tạo cơ hội bán hàng
          </Button>
        }
      />
      <div className="crm-filter-bar mb-4 flex flex-wrap gap-3">
        <Input.Search
          placeholder="Tìm cơ hội bán hàng..."
          defaultValue={currentSearch}
          onSearch={handleSearch}
          allowClear
          className="w-64"
        />
        <Select
          placeholder="Lọc theo giai đoạn"
          allowClear
          value={currentStage}
          onChange={handleStageFilter}
          className="w-48"
        >
          {Object.values(OpportunityStage).map((s) => (
            <Select.Option key={s} value={s}>
              {getStatusLabel(s)}
            </Select.Option>
          ))}
        </Select>
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
      fallback={
        <div className="p-4 text-center">{EMPTY_STATE_LABELS.loading}</div>
      }
    >
      <OpportunitiesList />
    </Suspense>
  );
}
