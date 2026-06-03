"use client";

import { useCallback, useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { UserRole } from "@/features/auth/auth.types";
import { useAuthStore } from "@/features/auth/auth.store";
import { taskTemplatesApi } from "@/features/task-templates/task-templates.api";
import {
  TaskTemplate,
  TaskTemplatePayload,
  TaskTemplatePriority,
} from "@/features/task-templates/task-templates.types";
import { getApiErrorMessage } from "@/lib/api/error";
import { getPriorityLabel } from "@/lib/constants/vi-labels";

const { TextArea } = Input;
const { Text } = Typography;

const priorityOptions = [
  { value: "LOW", label: getPriorityLabel("LOW") },
  { value: "NORMAL", label: getPriorityLabel("NORMAL") },
  { value: "HIGH", label: getPriorityLabel("HIGH") },
];

const defaultItem = (sortOrder: number) => ({
  title: "",
  description: "",
  priority: "NORMAL" as TaskTemplatePriority,
  dueAfterDays: 1,
  sortOrder,
  isActive: true,
});

const defaultGroup = (sortOrder: number) => ({
  name: "",
  description: "",
  sortOrder,
  items: [defaultItem(1)],
});

export default function TaskTemplatesPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [form] = Form.useForm<TaskTemplatePayload>();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const canManage = user?.role === UserRole.ADMIN;

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setTemplates(await taskTemplatesApi.getAll());
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tải mẫu công việc"));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = window.setTimeout(fetchTemplates, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTemplates]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    form.setFieldsValue({
      name: "",
      description: "",
      isActive: true,
      isDefault: templates.every((template) => !template.isDefault),
      groups: [defaultGroup(1)],
    });
    setModalOpen(true);
  };

  const openEditModal = (template: TaskTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      isDefault: template.isDefault,
      groups: template.groups.length > 0 ? template.groups : [defaultGroup(1)],
    });
    setModalOpen(true);
  };

  const normalizePayload = (values: TaskTemplatePayload): TaskTemplatePayload => ({
    ...values,
    groups: (values.groups || []).map((group, groupIndex) => ({
      ...group,
      sortOrder: group.sortOrder || groupIndex + 1,
      items: (group.items || []).map((item, itemIndex) => ({
        ...item,
        priority: item.priority || "NORMAL",
        dueAfterDays: item.dueAfterDays ?? 1,
        sortOrder: item.sortOrder || itemIndex + 1,
        isActive: item.isActive ?? true,
      })),
    })),
  });

  const handleSubmit = async (values: TaskTemplatePayload) => {
    try {
      setSaving(true);
      const payload = normalizePayload(values);
      if (editingTemplate) {
        await taskTemplatesApi.update(editingTemplate.id, payload);
        message.success("Đã cập nhật mẫu công việc");
      } else {
        await taskTemplatesApi.create(payload);
        message.success("Đã tạo mẫu công việc");
      }
      setModalOpen(false);
      await fetchTemplates();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể lưu mẫu công việc"));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (template: TaskTemplate) => {
    try {
      await taskTemplatesApi.setDefault(template.id);
      message.success("Đã đặt mẫu công việc làm mặc định");
      await fetchTemplates();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể đặt mẫu mặc định"));
    }
  };

  const handleDeactivate = async (template: TaskTemplate) => {
    try {
      await taskTemplatesApi.deactivate(template.id);
      message.success("Đã tắt mẫu công việc");
      await fetchTemplates();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tắt mẫu công việc"));
    }
  };

  const columns: TableColumnsType<TaskTemplate> = [
      {
        title: "Tên mẫu",
        key: "name",
        render: (_, record) => (
          <div>
            <div className="font-semibold">{record.name}</div>
            <Text type="secondary">{record.description || "-"}</Text>
          </div>
        ),
      },
      {
        title: "Trạng thái",
        key: "status",
        render: (_, record) => (
          <Space wrap>
            <Tag color={record.isActive ? "green" : "default"}>
              {record.isActive ? "Đang áp dụng" : "Đã tắt"}
            </Tag>
            {record.isDefault && <Tag color="gold">Mặc định</Tag>}
          </Space>
        ),
      },
      {
        title: "Cấu trúc",
        key: "structure",
        render: (_, record) => (
          <span>
            {record.groupCount} nhóm / {record.itemCount} công việc
          </span>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        render: (_, record) =>
          canManage ? (
            <Space wrap>
              <Button size="small" onClick={() => openEditModal(record)}>
                Sửa
              </Button>
              {record.isActive && !record.isDefault && (
                <Button
                  size="small"
                  icon={<StarOutlined />}
                  onClick={() => handleSetDefault(record)}
                >
                  Đặt mặc định
                </Button>
              )}
              {record.isActive && (
                <Popconfirm
                  title="Tắt mẫu công việc này?"
                  okText="Tắt"
                  cancelText="Hủy"
                  onConfirm={() => handleDeactivate(record)}
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
        title="Mẫu công việc"
        subtitle="Quản lý các mẫu công việc tự động tạo sau khi chuyển đổi khách hàng tiềm năng."
        showBack
        action={
          canManage ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Tạo mẫu công việc
            </Button>
          ) : undefined
        }
      />

      <Card className="shadow-sm">
        {loading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : templates.length === 0 ? (
          <Empty description="Chưa có mẫu công việc nào. Admin có thể tạo mẫu để dùng sau khi chuyển đổi Lead.">
            {canManage && (
              <Button type="primary" onClick={openCreateModal}>
                Tạo mẫu công việc
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={templates}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={editingTemplate ? "Sửa mẫu công việc" : "Tạo mẫu công việc"}
        open={modalOpen}
        width={1000}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingTemplate ? "Lưu thay đổi" : "Tạo mẫu"}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              name="name"
              label="Tên mẫu"
              rules={[{ required: true, message: "Vui lòng nhập tên mẫu." }]}
            >
              <Input maxLength={160} />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Áp dụng" unCheckedChildren="Tắt" />
              </Form.Item>
              <Form.Item name="isDefault" label="Mặc định" valuePropName="checked">
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </div>
          </div>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} maxLength={1000} />
          </Form.Item>

          <Form.List name="groups">
            {(groupFields, { add: addGroup, remove: removeGroup }) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Typography.Title level={5} className="!mb-0">
                    Nhóm việc
                  </Typography.Title>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addGroup(defaultGroup(groupFields.length + 1))}
                  >
                    Thêm nhóm việc
                  </Button>
                </div>

                <Collapse
                  accordion={false}
                  items={groupFields.map((groupField, groupIndex) => ({
                    key: groupField.key,
                    label: `Nhóm ${groupIndex + 1}`,
                    children: (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px_auto]">
                          <Form.Item
                            {...groupField}
                            name={[groupField.name, "name"]}
                            label="Tên nhóm"
                            rules={[{ required: true, message: "Vui lòng nhập tên nhóm." }]}
                          >
                            <Input maxLength={160} />
                          </Form.Item>
                          <Form.Item
                            name={[groupField.name, "sortOrder"]}
                            label="Thứ tự"
                          >
                            <InputNumber min={0} className="w-full" />
                          </Form.Item>
                          <div className="pt-7">
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeGroup(groupField.name)}
                            >
                              Xóa nhóm
                            </Button>
                          </div>
                        </div>
                        <Form.Item
                          name={[groupField.name, "description"]}
                          label="Mô tả nhóm"
                        >
                          <TextArea rows={2} maxLength={1000} />
                        </Form.Item>

                        <Form.List name={[groupField.name, "items"]}>
                          {(itemFields, { add: addItem, remove: removeItem }) => (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Text strong>Công việc nhỏ</Text>
                                <Button
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => addItem(defaultItem(itemFields.length + 1))}
                                >
                                  Thêm công việc
                                </Button>
                              </div>
                              {itemFields.map((itemField, itemIndex) => (
                                <Card
                                  key={itemField.key}
                                  size="small"
                                  title={`Công việc ${itemIndex + 1}`}
                                  extra={
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => removeItem(itemField.name)}
                                    />
                                  }
                                >
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Form.Item
                                      name={[itemField.name, "title"]}
                                      label="Tên công việc"
                                      rules={[
                                        {
                                          required: true,
                                          message: "Vui lòng nhập tên công việc.",
                                        },
                                      ]}
                                    >
                                      <Input maxLength={160} />
                                    </Form.Item>
                                    <div className="grid grid-cols-3 gap-3">
                                      <Form.Item
                                        name={[itemField.name, "priority"]}
                                        label="Ưu tiên"
                                      >
                                        <Select options={priorityOptions} />
                                      </Form.Item>
                                      <Form.Item
                                        name={[itemField.name, "dueAfterDays"]}
                                        label="Sau ngày"
                                      >
                                        <InputNumber min={0} max={365} className="w-full" />
                                      </Form.Item>
                                      <Form.Item
                                        name={[itemField.name, "sortOrder"]}
                                        label="Thứ tự"
                                      >
                                        <InputNumber min={0} className="w-full" />
                                      </Form.Item>
                                    </div>
                                  </div>
                                  <Form.Item
                                    name={[itemField.name, "description"]}
                                    label="Mô tả công việc"
                                  >
                                    <TextArea rows={2} maxLength={1000} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[itemField.name, "isActive"]}
                                    label="Đang áp dụng"
                                    valuePropName="checked"
                                  >
                                    <Switch checkedChildren="Có" unCheckedChildren="Không" />
                                  </Form.Item>
                                </Card>
                              ))}
                            </div>
                          )}
                        </Form.List>
                      </div>
                    ),
                  }))}
                />
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
