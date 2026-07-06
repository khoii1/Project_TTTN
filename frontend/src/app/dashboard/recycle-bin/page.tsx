"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, UndoOutlined } from "@ant-design/icons";
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
import { useAuthStore } from "@/features/auth/auth.store";
import {
  PermanentDeleteEntity,
  recycleBinApi,
} from "@/features/recycle-bin/recycle-bin.api";
import { getApiErrorMessage } from "@/lib/api/error";

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

const entityTypes: DeletedRecord["type"][] = [
  "Lead",
  "Account",
  "Contact",
  "Opportunity",
  "Task",
  "Case",
];

const permanentDeleteType: Record<
  DeletedRecord["type"],
  PermanentDeleteEntity
> = {
  Lead: "lead",
  Account: "account",
  Contact: "contact",
  Opportunity: "opportunity",
  Task: "task",
  Case: "case",
};

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
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<RecycleType>("All");
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DeletedRecord | null>(
    null,
  );
  const [confirmationText, setConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Promise.all(entityTypes.map(fetchDeletedByType));
      setRecords(result.flat());
    } catch {
      message.error("Không thể tải bản ghi đã xóa");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = window.setTimeout(loadRecords, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const handleRestore = async (record: DeletedRecord) => {
    try {
      await restoreRecord(record);
      message.success("Đã khôi phục bản ghi");
      removeRecordFromState(record);
    } catch {
      message.error("Không thể khôi phục bản ghi");
    }
  };

  const visibleRecords = useMemo(
    () =>
      activeTab === "All"
        ? records
        : records.filter((record) => record.type === activeTab),
    [activeTab, records],
  );

  const tabItems = useMemo(() => {
    const count = (type: RecycleType) =>
      type === "All"
        ? records.length
        : records.filter((record) => record.type === type).length;

    return [
      { key: "All", label: `Tất cả (${count("All")})` },
      { key: "Lead", label: `${ENTITY_LABELS.leads} (${count("Lead")})` },
      { key: "Account", label: `${ENTITY_LABELS.accounts} (${count("Account")})` },
      { key: "Contact", label: `${ENTITY_LABELS.contacts} (${count("Contact")})` },
      {
        key: "Opportunity",
        label: `${ENTITY_LABELS.opportunities} (${count("Opportunity")})`,
      },
      { key: "Task", label: `${ENTITY_LABELS.tasks} (${count("Task")})` },
      { key: "Case", label: `${ENTITY_LABELS.cases} (${count("Case")})` },
    ];
  }, [records]);

  const removeRecordFromState = (record: DeletedRecord) => {
    setRecords((current) => {
      const next = current.filter(
        (item) => !(item.id === record.id && item.type === record.type),
      );
      const nextVisibleCount =
        activeTab === "All"
          ? next.length
          : next.filter((item) => item.type === activeTab).length;
      const maxPage = Math.max(
        1,
        Math.ceil(nextVisibleCount / pagination.pageSize),
      );
      setPagination((currentPagination) => ({
        ...currentPagination,
        current: Math.min(currentPagination.current, maxPage),
      }));
      return next;
    });
  };

  const openPermanentDeleteModal = (record: DeletedRecord) => {
    setConfirmationText("");
    setRecordToDelete(record);
  };

  const closePermanentDeleteModal = () => {
    if (deleting) return;
    setConfirmationText("");
    setRecordToDelete(null);
  };

  const handlePermanentDelete = async () => {
    if (!recordToDelete || confirmationText.trim() !== "XÓA" || deleting) {
      return;
    }

    setDeleting(true);
    try {
      await recycleBinApi.permanentDelete(
        permanentDeleteType[recordToDelete.type],
        recordToDelete.id,
      );
      removeRecordFromState(recordToDelete);
      message.success("Đã xóa vĩnh viễn bản ghi");
      setRecordToDelete(null);
      setConfirmationText("");
    } catch (error) {
      message.error(
        getApiErrorMessage(error, "Không thể xóa vĩnh viễn bản ghi"),
      );
    } finally {
      setDeleting(false);
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
      width: isAdmin ? 260 : 130,
      render: (_, record) => (
        <Space wrap size={4}>
          <Popconfirm
            title={FEEDBACK_LABELS.restoreConfirm}
            onConfirm={() => handleRestore(record)}
          >
            <Button type="text" icon={<UndoOutlined />}>
              Khôi phục
            </Button>
          </Popconfirm>
          {isAdmin ? (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xóa vĩnh viễn ${record.name}`}
              onClick={() => openPermanentDeleteModal(record)}
            >
              Xóa vĩnh viễn
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={ENTITY_LABELS.recycleBin} />
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as RecycleType);
          setPagination((current) => ({ ...current, current: 1 }));
        }}
        items={tabItems}
      />
      <Table
        columns={columns}
        dataSource={visibleRecords}
        rowKey={(record) => `${record.type}-${record.id}`}
        loading={loading}
        locale={{
          emptyText: (
            <Empty description={EMPTY_STATE_LABELS.noDeletedRecords} />
          ),
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          onChange: (current, pageSize) =>
            setPagination({ current, pageSize }),
        }}
        scroll={{ x: 900 }}
        className="shadow-sm bg-white rounded-lg"
      />
      <Modal
        title="Xóa vĩnh viễn"
        open={Boolean(recordToDelete)}
        onCancel={closePermanentDeleteModal}
        onOk={handlePermanentDelete}
        okText="Xóa vĩnh viễn"
        cancelText="Hủy"
        confirmLoading={deleting}
        okButtonProps={{
          danger: true,
          disabled: confirmationText.trim() !== "XÓA" || deleting,
        }}
        closable={!deleting}
        maskClosable={!deleting}
      >
        <p className="mb-2 text-gray-700">
          Bạn có chắc chắn muốn xóa vĩnh viễn{" "}
          <strong>“{recordToDelete?.name}”</strong> không?
        </p>
        <p className="mb-4 text-gray-600">
          Hành động này không thể hoàn tác và bản ghi sẽ không còn xuất hiện
          trong Thùng rác.
        </p>
        <label className="mb-1 block font-medium text-gray-800">
          Nhập <strong>XÓA</strong> để xác nhận
        </label>
        <Input
          autoFocus
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          onPressEnter={handlePermanentDelete}
          disabled={deleting}
          placeholder="XÓA"
        />
      </Modal>
    </div>
  );
}
