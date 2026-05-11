"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Empty, Popconfirm, Table, Tabs, Tag, App } from "antd";
import type { TableColumnsType } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead } from "@/features/leads/leads.types";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task } from "@/features/tasks/tasks.types";
import { UserReferenceDisplay } from "@/components/crm/UserReferenceDisplay";
import { getDataArray } from "@/lib/api/pagination";
import {
  EMPTY_STATE_LABELS,
  ENTITY_LABELS,
  FEEDBACK_LABELS,
  FIELD_LABELS,
} from "@/lib/constants/vi-labels";

type RecycleType =
  | "All"
  | "Lead"
  | "Account"
  | "Contact"
  | "Opportunity"
  | "Task"
  | "Case";

type DeletedRecord = {
  id: string;
  type: Exclude<RecycleType, "All">;
  name: string;
  deletedAt?: string;
  deletedById?: string;
  ownerId?: string;
};

const deletedParams = { deleted: true, page: 1, limit: 50 };

const getLeadLabel = (lead: Lead) =>
  [lead.lastName, lead.company].filter(Boolean).join(" - ");

const getContactLabel = (contact: Contact) =>
  [contact.firstName, contact.lastName].filter(Boolean).join(" ");

const toDeletedRecord = (
  type: DeletedRecord["type"],
  record: Lead | Account | Contact | Opportunity | Task | Case,
): DeletedRecord => {
  switch (type) {
    case "Lead": {
      const lead = record as Lead;
      return {
        id: lead.id,
        type,
        name: getLeadLabel(lead),
        deletedAt: lead.deletedAt,
        deletedById: lead.deletedById,
        ownerId: lead.ownerId,
      };
    }
    case "Account": {
      const account = record as Account;
      return {
        id: account.id,
        type,
        name: account.name,
        deletedAt: account.deletedAt,
        deletedById: account.deletedById,
        ownerId: account.ownerId,
      };
    }
    case "Contact": {
      const contact = record as Contact;
      return {
        id: contact.id,
        type,
        name: getContactLabel(contact),
        deletedAt: contact.deletedAt,
        deletedById: contact.deletedById,
        ownerId: contact.ownerId,
      };
    }
    case "Opportunity": {
      const opportunity = record as Opportunity;
      return {
        id: opportunity.id,
        type,
        name: opportunity.name,
        deletedAt: opportunity.deletedAt,
        deletedById: opportunity.deletedById,
        ownerId: opportunity.ownerId,
      };
    }
    case "Task": {
      const task = record as Task;
      return {
        id: task.id,
        type,
        name: task.subject,
        deletedAt: task.deletedAt,
        deletedById: task.deletedById,
        ownerId: task.ownerId,
      };
    }
    case "Case": {
      const crmCase = record as Case;
      return {
        id: crmCase.id,
        type,
        name: crmCase.subject,
        deletedAt: crmCase.deletedAt,
        deletedById: crmCase.deletedById,
        ownerId: crmCase.ownerId,
      };
    }
  }
};

const fetchDeletedByType = async (
  type: DeletedRecord["type"],
): Promise<DeletedRecord[]> => {
  switch (type) {
    case "Lead":
      return getDataArray<Lead>(await leadsApi.getAll(deletedParams)).map(
        (record) => toDeletedRecord(type, record),
      );
    case "Account":
      return getDataArray<Account>(await accountsApi.getAll(deletedParams)).map(
        (record) => toDeletedRecord(type, record),
      );
    case "Contact":
      return getDataArray<Contact>(await contactsApi.getAll(deletedParams)).map(
        (record) => toDeletedRecord(type, record),
      );
    case "Opportunity":
      return getDataArray<Opportunity>(
        await opportunitiesApi.getAll(deletedParams),
      ).map((record) => toDeletedRecord(type, record));
    case "Task":
      return getDataArray<Task>(await tasksApi.getAll(deletedParams)).map(
        (record) => toDeletedRecord(type, record),
      );
    case "Case":
      return getDataArray<Case>(await casesApi.getAll(deletedParams)).map(
        (record) => toDeletedRecord(type, record),
      );
  }
};

const restoreRecord = async (record: DeletedRecord) => {
  switch (record.type) {
    case "Lead":
      return leadsApi.restore(record.id);
    case "Account":
      return accountsApi.restore(record.id);
    case "Contact":
      return contactsApi.restore(record.id);
    case "Opportunity":
      return opportunitiesApi.restore(record.id);
    case "Task":
      return tasksApi.restore(record.id);
    case "Case":
      return casesApi.restore(record.id);
  }
};

const entityTabs: { key: RecycleType; label: string }[] = [
  { key: "All", label: "Tất cả" },
  { key: "Lead", label: ENTITY_LABELS.leads },
  { key: "Account", label: ENTITY_LABELS.accounts },
  { key: "Contact", label: ENTITY_LABELS.contacts },
  { key: "Opportunity", label: ENTITY_LABELS.opportunities },
  { key: "Task", label: ENTITY_LABELS.tasks },
  { key: "Case", label: ENTITY_LABELS.cases },
];

const entityTypes: DeletedRecord["type"][] = [
  "Lead",
  "Account",
  "Contact",
  "Opportunity",
  "Task",
  "Case",
];

const getRecycleTypeLabel = (type: RecycleType) => {
  switch (type) {
    case "All":
      return "Tất cả";
    case "Lead":
      return ENTITY_LABELS.lead;
    case "Account":
      return ENTITY_LABELS.account;
    case "Contact":
      return ENTITY_LABELS.contact;
    case "Opportunity":
      return ENTITY_LABELS.opportunity;
    case "Task":
      return ENTITY_LABELS.task;
    case "Case":
      return ENTITY_LABELS.case;
  }
};

export default function RecycleBinPage() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<RecycleType>("All");
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const types = activeTab === "All" ? entityTypes : [activeTab];
      const result = await Promise.all(types.map(fetchDeletedByType));
      setRecords(result.flat());
    } catch {
      message.error("Không thể tải bản ghi đã xóa");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = window.setTimeout(loadRecords, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const handleRestore = async (record: DeletedRecord) => {
    try {
      await restoreRecord(record);
      message.success("Đã khôi phục bản ghi");
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch {
      message.error("Không thể khôi phục bản ghi");
    }
  };

  const columns: TableColumnsType<DeletedRecord> = [
    {
      title: "Tên / Tiêu đề",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: FIELD_LABELS.type,
      dataIndex: "type",
      key: "type",
      render: (type: DeletedRecord["type"]) => (
        <Tag>{getRecycleTypeLabel(type)}</Tag>
      ),
    },
    {
      title: "Ngày xóa",
      dataIndex: "deletedAt",
      key: "deletedAt",
      render: (deletedAt?: string) =>
        deletedAt ? new Date(deletedAt).toLocaleString() : "-",
    },
    {
      title: "Người xóa",
      dataIndex: "deletedById",
      key: "deletedById",
      render: (deletedById?: string) => (
        <UserReferenceDisplay userId={deletedById} />
      ),
    },
    {
      title: FIELD_LABELS.owner,
      dataIndex: "ownerId",
      key: "ownerId",
      render: (ownerId?: string) => <UserReferenceDisplay userId={ownerId} />,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title={FEEDBACK_LABELS.restoreConfirm}
          onConfirm={() => handleRestore(record)}
        >
          <Button type="text" icon={<UndoOutlined />}>
            Khôi phục
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={ENTITY_LABELS.recycleBin} />
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as RecycleType)}
        items={entityTabs}
      />
      <Table
        columns={columns}
        dataSource={records}
        rowKey={(record) => `${record.type}-${record.id}`}
        loading={loading}
        locale={{
          emptyText: (
            <Empty description={EMPTY_STATE_LABELS.noDeletedRecords} />
          ),
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        className="shadow-sm bg-white rounded-lg"
      />
    </div>
  );
}
