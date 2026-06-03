"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import { PageHeader } from "@/components/common/PageHeader";
import { User, UserRole } from "@/features/auth/auth.types";
import { useAuthStore } from "@/features/auth/auth.store";
import { leadAssignmentApi } from "@/features/lead-assignment/lead-assignment.api";
import {
  LeadAssignmentRule,
  LeadAssignmentRulePayload,
} from "@/features/lead-assignment/lead-assignment.types";
import { usersApi } from "@/features/users/users.api";
import { getApiErrorMessage } from "@/lib/api/error";
import { getDataArray } from "@/lib/api/pagination";
import { getRoleLabel } from "@/lib/constants/vi-labels";

type RuleFormValues = LeadAssignmentRulePayload;

export default function LeadAssignmentSettingsPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [form] = Form.useForm<RuleFormValues>();
  const [rules, setRules] = useState<LeadAssignmentRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadAssignmentRule | null>(null);

  const canManage = user?.role === UserRole.ADMIN;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ruleItems, userRes] = await Promise.all([
        leadAssignmentApi.getAll(),
        usersApi.getAll({ limit: 100 }),
      ]);
      setRules(ruleItems);
      setUsers(getDataArray<User>(userRes));
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tải quy tắc phân công Lead"));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const assigneeOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.id,
        label: `${[item.firstName, item.lastName].filter(Boolean).join(" ")} - ${item.email}`,
      })),
    [users],
  );

  const openCreateModal = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setModalOpen(true);
  };

  const openEditModal = (rule: LeadAssignmentRule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      provinceName: rule.provinceName,
      wardName: rule.wardName,
      assigneeId: rule.assigneeId,
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: RuleFormValues) => {
    try {
      setSaving(true);
      if (editingRule) {
        await leadAssignmentApi.update(editingRule.id, values);
        message.success("Đã cập nhật quy tắc phân công Lead");
      } else {
        await leadAssignmentApi.create(values);
        message.success("Đã tạo quy tắc phân công Lead");
      }
      setModalOpen(false);
      await fetchData();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể lưu quy tắc phân công Lead"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await leadAssignmentApi.deactivate(id);
      message.success("Đã tắt quy tắc phân công Lead");
      await fetchData();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tắt quy tắc phân công Lead"));
    }
  };

  const columns: TableColumnsType<LeadAssignmentRule> = [
    {
      title: "Tỉnh/Thành phố",
      dataIndex: "provinceName",
      key: "provinceName",
    },
    {
      title: "Phường/Xã",
      dataIndex: "wardName",
      key: "wardName",
    },
    {
      title: "Người phụ trách",
      key: "assignee",
      render: (_, record) =>
        record.assigneeName || record.assigneeEmail
          ? `${record.assigneeName || ""}${record.assigneeEmail ? ` (${record.assigneeEmail})` : ""}`
          : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>
          {isActive ? "Đang áp dụng" : "Đã tắt"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) =>
        canManage ? (
          <Space>
            <Button size="small" onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            {record.isActive && (
              <Popconfirm
                title="Tắt quy tắc này?"
                okText="Tắt"
                cancelText="Hủy"
                onConfirm={() => handleDeactivate(record.id)}
              >
                <Button size="small" danger>
                  Tắt
                </Button>
              </Popconfirm>
            )}
          </Space>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân công Lead theo khu vực"
        subtitle="Thiết lập tỉnh/thành phố và phường/xã để tự động giao Lead cho người phụ trách."
        showBack
        action={
          canManage ? (
            <Button type="primary" onClick={openCreateModal}>
              Thêm quy tắc
            </Button>
          ) : undefined
        }
      />

      <Card className="shadow-sm">
        <div className="mb-4 text-sm text-gray-600">
          Vai trò hiện tại:{" "}
          <Tag color="blue" className="m-0">
            {getRoleLabel(user?.role)}
          </Tag>{" "}
          {canManage
            ? "Bạn có thể tạo, sửa và tắt quy tắc."
            : "Bạn có thể xem quy tắc, chỉ Admin mới được chỉnh sửa."}
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rules}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRule ? "Sửa quy tắc phân công Lead" : "Thêm quy tắc phân công Lead"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingRule ? "Lưu thay đổi" : "Tạo quy tắc"}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
          <Form.Item
            name="provinceName"
            label="Tỉnh/Thành phố"
            rules={[{ required: true, message: "Vui lòng nhập tỉnh/thành phố." }]}
          >
            <Input placeholder="TP. Hồ Chí Minh" maxLength={120} />
          </Form.Item>
          <Form.Item
            name="wardName"
            label="Phường/Xã"
            rules={[{ required: true, message: "Vui lòng nhập phường/xã." }]}
          >
            <Input placeholder="Phường Bến Nghé" maxLength={120} />
          </Form.Item>
          <Form.Item
            name="assigneeId"
            label="Người phụ trách"
            rules={[{ required: true, message: "Vui lòng chọn người phụ trách." }]}
          >
            <Select
              showSearch
              placeholder="Chọn nhân viên phụ trách"
              optionFilterProp="label"
              options={assigneeOptions}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Áp dụng" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
