"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Empty, message, Popconfirm, Table, Tabs, Tag } from "antd";
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
  { key: "All", label: "All" },
  { key: "Lead", label: "Leads" },
  { key: "Account", label: "Accounts" },
  { key: "Contact", label: "Contacts" },
  { key: "Opportunity", label: "Opportunities" },
  { key: "Task", label: "Tasks" },
  { key: "Case", label: "Cases" },
];

const entityTypes: DeletedRecord["type"][] = [
  "Lead",
  "Account",
  "Contact",
  "Opportunity",
  "Task",
  "Case",
];

export default function RecycleBinPage() {
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
      message.error("Failed to load deleted records");
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
      message.success(`${record.type} restored`);
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch {
      message.error(`Failed to restore ${record.type.toLowerCase()}`);
    }
  };

  const columns: TableColumnsType<DeletedRecord> = [
      {
        title: "Name / Subject",
        dataIndex: "name",
        key: "name",
        render: (name: string) => <span className="font-medium">{name}</span>,
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        render: (type: string) => <Tag>{type}</Tag>,
      },
      {
        title: "Deleted At",
        dataIndex: "deletedAt",
        key: "deletedAt",
        render: (deletedAt?: string) =>
          deletedAt ? new Date(deletedAt).toLocaleString() : "N/A",
      },
      {
        title: "Owner",
        dataIndex: "ownerId",
        key: "ownerId",
        render: (ownerId?: string) => (
          <UserReferenceDisplay userId={ownerId} />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Popconfirm
            title={`Restore this ${record.type.toLowerCase()}?`}
            onConfirm={() => handleRestore(record)}
          >
            <Button type="text" icon={<UndoOutlined />}>
              Restore
            </Button>
          </Popconfirm>
        ),
      },
    ];

  return (
    <div>
      <PageHeader title="Recycle Bin" />
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as RecycleType)}
        items={entityTabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
        }))}
      />
      <Table
        columns={columns}
        dataSource={records}
        rowKey={(record) => `${record.type}-${record.id}`}
        loading={loading}
        locale={{ emptyText: <Empty description="No deleted records found." /> }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        className="shadow-sm bg-white rounded-lg"
      />
    </div>
  );
}
