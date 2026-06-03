"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { HcmWardSelect } from "@/components/crm/HcmWardSelect";
import { User, UserRole, UserRoleType } from "@/features/auth/auth.types";
import { useAuthStore } from "@/features/auth/auth.store";
import { leadAssignmentApi } from "@/features/lead-assignment/lead-assignment.api";
import {
  LeadAssignmentRule,
  LeadAssignmentRulePayload,
} from "@/features/lead-assignment/lead-assignment.types";
import { usersApi } from "@/features/users/users.api";
import { getApiErrorMessage } from "@/lib/api/error";
import { getDataArray } from "@/lib/api/pagination";
import {
  HCM_PROVINCE_NAME,
  normalizeVietnameseSearch,
} from "@/lib/constants/hcm-wards";
import { getRoleLabel } from "@/lib/constants/vi-labels";

const { Text } = Typography;

type RuleFormValues = Omit<LeadAssignmentRulePayload, "wardName"> & {
  wardNames: string[];
};

type RuleGroup = {
  assigneeId: string;
  assigneeName: string;
  assigneeEmail?: string;
  assigneeRole?: UserRoleType;
  activeRules: LeadAssignmentRule[];
  inactiveRules: LeadAssignmentRule[];
};

const getAssigneeDisplayName = (rule: LeadAssignmentRule, user?: User) => {
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return userName || rule.assigneeName || rule.assigneeEmail || "Chưa có tên";
};

const getAssigneeEmail = (rule: LeadAssignmentRule, user?: User) =>
  user?.email || rule.assigneeEmail;

const sortRulesByWard = (items: LeadAssignmentRule[]) =>
  [...items].sort((a, b) => a.wardName.localeCompare(b.wardName, "vi"));

const getAreaKey = (rule: Pick<LeadAssignmentRule, "provinceName" | "wardName">) =>
  `${rule.provinceName.trim().toLowerCase()}::${rule.wardName.trim().toLowerCase()}`;

const isSameArea = (rule: LeadAssignmentRule, wardName: string) =>
  rule.provinceName === HCM_PROVINCE_NAME && rule.wardName === wardName;

export default function LeadAssignmentSettingsPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [form] = Form.useForm<RuleFormValues>();
  const [rules, setRules] = useState<LeadAssignmentRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const canManage = user?.role === UserRole.ADMIN;
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  const fetchData = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

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
  }, [canView, message]);

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const userById = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const assigneeOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.id,
        label: `${[item.firstName, item.lastName].filter(Boolean).join(" ")} - ${item.email}`,
      })),
    [users],
  );

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.isActive),
    [rules],
  );

  const groupedRules = useMemo(() => {
    const sourceRules = showInactive ? rules : activeRules;
    const groups = new Map<string, RuleGroup>();

    sourceRules.forEach((rule) => {
      const assignee = userById.get(rule.assigneeId);
      const existing = groups.get(rule.assigneeId);
      const group =
        existing ||
        {
          assigneeId: rule.assigneeId,
          assigneeName: getAssigneeDisplayName(rule, assignee),
          assigneeEmail: getAssigneeEmail(rule, assignee),
          assigneeRole: assignee?.role,
          activeRules: [],
          inactiveRules: [],
        };

      if (rule.isActive) {
        group.activeRules.push(rule);
      } else {
        group.inactiveRules.push(rule);
      }

      groups.set(rule.assigneeId, group);
    });

    const normalizedSearch = normalizeVietnameseSearch(searchText);

    return Array.from(groups.values())
      .map((group) => {
        const activeAreaKeys = new Set(group.activeRules.map(getAreaKey));

        return {
          ...group,
          activeRules: sortRulesByWard(group.activeRules),
          inactiveRules: sortRulesByWard(
            group.inactiveRules.filter((rule) => !activeAreaKeys.has(getAreaKey(rule))),
          ),
        };
      })
      .filter((group) => {
        if (!normalizedSearch) return true;

        const haystack = normalizeVietnameseSearch(
          [
            group.assigneeName,
            group.assigneeEmail,
            group.assigneeRole ? getRoleLabel(group.assigneeRole) : "",
            ...group.activeRules.map((rule) => rule.wardName),
            ...group.inactiveRules.map((rule) => rule.wardName),
          ].join(" "),
        );

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => a.assigneeName.localeCompare(b.assigneeName, "vi"));
  }, [activeRules, rules, searchText, showInactive, userById]);

  const openCreateModal = (assigneeId?: string) => {
    form.resetFields();
    form.setFieldsValue({
      assigneeId,
      isActive: true,
      provinceName: HCM_PROVINCE_NAME,
      wardNames: [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: RuleFormValues) => {
    const wardNames = Array.from(new Set(values.wardNames || []));
    const currentActiveRules = rules.filter((rule) => rule.isActive);
    const conflictingRules = wardNames
      .map((wardName) =>
        currentActiveRules.find(
          (rule) =>
            rule.provinceName === HCM_PROVINCE_NAME &&
            rule.wardName === wardName &&
            rule.assigneeId !== values.assigneeId,
        ),
      )
      .filter(Boolean) as LeadAssignmentRule[];

    if (conflictingRules.length > 0) {
      message.error(
        `Không thể lưu vì ${conflictingRules
          .map((rule) => rule.wardName)
          .join(", ")} đã có người phụ trách đang áp dụng.`,
      );
      return;
    }

    const duplicateWardNames = wardNames.filter((wardName) =>
      currentActiveRules.some(
        (rule) =>
          rule.provinceName === HCM_PROVINCE_NAME &&
          rule.wardName === wardName &&
          rule.assigneeId === values.assigneeId,
      ),
    );
    const newWardNames = wardNames.filter(
      (wardName) => !duplicateWardNames.includes(wardName),
    );
    const reactivatableRules = newWardNames
      .map((wardName) =>
        rules.find(
          (rule) =>
            !rule.isActive &&
            isSameArea(rule, wardName) &&
            rule.assigneeId === values.assigneeId,
        ),
      )
      .filter(Boolean) as LeadAssignmentRule[];
    const reactivatedWardNames = new Set(
      reactivatableRules.map((rule) => rule.wardName),
    );
    const createWardNames = newWardNames.filter(
      (wardName) => !reactivatedWardNames.has(wardName),
    );

    if (newWardNames.length === 0) {
      message.warning("Các phường/xã đã chọn đều đang được phân công cho người này.");
      return;
    }

    try {
      setSaving(true);
      await Promise.all(
        [
          ...reactivatableRules.map((rule) =>
            leadAssignmentApi.update(rule.id, {
              provinceName: HCM_PROVINCE_NAME,
              wardName: rule.wardName,
              assigneeId: values.assigneeId,
              isActive: true,
            }),
          ),
          ...createWardNames.map((wardName) =>
            leadAssignmentApi.create({
              provinceName: HCM_PROVINCE_NAME,
              wardName,
              assigneeId: values.assigneeId,
              isActive: true,
            }),
          ),
        ],
      );

      const skippedMessage =
        duplicateWardNames.length > 0
          ? ` Bỏ qua ${duplicateWardNames.length} phường/xã đã tồn tại.`
          : "";
      const createdMessage =
        createWardNames.length > 0 ? `Đã thêm ${createWardNames.length} phường/xã.` : "";
      const reactivatedMessage =
        reactivatableRules.length > 0
          ? `Đã mở lại ${reactivatableRules.length} quy tắc đã tắt.`
          : "";
      message.success(
        [createdMessage, reactivatedMessage, skippedMessage.trim()]
          .filter(Boolean)
          .join(" "),
      );
      setModalOpen(false);
      await fetchData();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể lưu quy tắc phân công Lead"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (rule: LeadAssignmentRule) => {
    try {
      await leadAssignmentApi.deactivate(rule.id);
      message.success(`Đã tắt quy tắc cho ${rule.wardName}`);
      await fetchData();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể tắt quy tắc phân công Lead"));
    }
  };

  const handleReactivate = async (rule: LeadAssignmentRule) => {
    const conflictingActiveRule = rules.find(
      (item) =>
        item.isActive &&
        isSameArea(item, rule.wardName) &&
        item.assigneeId !== rule.assigneeId,
    );

    if (conflictingActiveRule) {
      message.error(
        `${rule.wardName} đang được phân công cho ${conflictingActiveRule.assigneeEmail || "người khác"}.`,
      );
      return;
    }

    try {
      await leadAssignmentApi.update(rule.id, {
        provinceName: HCM_PROVINCE_NAME,
        wardName: rule.wardName,
        assigneeId: rule.assigneeId,
        isActive: true,
      });
      message.success(`Đã mở lại quy tắc cho ${rule.wardName}`);
      await fetchData();
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Không thể mở lại quy tắc phân công Lead"));
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Phân công Lead theo khu vực"
          subtitle="Chỉ Admin và Manager được xem khu vực phân công Lead."
          showBack
        />
        <Card className="shadow-sm">
          <Empty description="Bạn không có quyền xem trang quản lý quy tắc phân công Lead." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân công Lead theo khu vực"
        subtitle="Quản lý khu vực phụ trách theo từng nhân viên để tự động giao Lead."
        showBack
        action={
          canManage ? (
            <Button type="primary" onClick={() => openCreateModal()}>
              Thêm quy tắc
            </Button>
          ) : undefined
        }
      />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-gray-600">
            Vai trò hiện tại:{" "}
            <Tag color="blue" className="m-0">
              {getRoleLabel(user?.role)}
            </Tag>{" "}
            {canManage
              ? "Bạn có thể thêm phường/xã và tắt quy tắc đang áp dụng."
              : "Bạn có thể xem quy tắc, chỉ Admin mới được chỉnh sửa."}
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              className="w-full min-w-[280px] lg:w-[360px]"
              placeholder="Tìm người phụ trách, email hoặc phường/xã"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <Switch
              checked={showInactive}
              onChange={setShowInactive}
              checkedChildren="Hiện đã tắt"
              unCheckedChildren="Chỉ đang áp dụng"
            />
          </Space>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => (
            <Card key={item} loading className="shadow-sm" />
          ))}
        </div>
      ) : groupedRules.length === 0 ? (
        <Card className="shadow-sm">
          <Empty
            description={
              searchText
                ? "Không tìm thấy quy tắc phù hợp."
                : "Chưa có quy tắc phân công nào. Hãy thêm quy tắc để hệ thống tự động giao Lead cho nhân viên theo phường/xã."
            }
          >
            {canManage && !searchText && (
              <Button type="primary" onClick={() => openCreateModal()}>
                Thêm quy tắc
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groupedRules.map((group) => (
            <Card
              key={group.assigneeId}
              className="shadow-sm"
              title={
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {group.assigneeName}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {group.assigneeEmail && (
                      <Text type="secondary" className="text-sm">
                        {group.assigneeEmail}
                      </Text>
                    )}
                    {group.assigneeRole && (
                      <Tag color="geekblue" className="m-0">
                        {getRoleLabel(group.assigneeRole)}
                      </Tag>
                    )}
                  </div>
                </div>
              }
              extra={
                canManage ? (
                  <Button size="small" onClick={() => openCreateModal(group.assigneeId)}>
                    Thêm phường/xã
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  <Tag color="green" className="m-0">
                    Đang phụ trách {group.activeRules.length} khu vực
                  </Tag>
                  {showInactive && group.inactiveRules.length > 0 && (
                    <Tag className="m-0">Đã tắt {group.inactiveRules.length}</Tag>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    Phường/Xã đang áp dụng
                  </div>
                  {group.activeRules.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {group.activeRules.map((rule) => (
                        <Tag key={rule.id} color="blue" className="m-0 py-1">
                          <span>{rule.wardName}</span>
                          {canManage && (
                            <Popconfirm
                              title={`Tắt quy tắc cho ${rule.wardName}?`}
                              okText="Tắt"
                              cancelText="Hủy"
                              onConfirm={() => handleDeactivate(rule)}
                            >
                              <button
                                type="button"
                                className="ml-2 cursor-pointer border-0 bg-transparent p-0 text-blue-700"
                                aria-label={`Tắt quy tắc ${rule.wardName}`}
                              >
                                x
                              </button>
                            </Popconfirm>
                          )}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Không có phường/xã đang áp dụng.</Text>
                  )}
                </div>

                {showInactive && group.inactiveRules.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium text-gray-700">
                      Quy tắc đã tắt
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.inactiveRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1"
                        >
                          <Tag className="m-0 border-0 bg-transparent px-0 font-medium">
                            {rule.wardName}
                          </Tag>
                          {canManage && (
                            <Popconfirm
                              title={`Mở lại quy tắc cho ${rule.wardName}?`}
                              okText="Mở lại"
                              cancelText="Hủy"
                              onConfirm={() => handleReactivate(rule)}
                            >
                              <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<ReloadOutlined />}
                                aria-label={`Mở lại quy tắc ${rule.wardName}`}
                              >
                                Mở lại
                              </Button>
                            </Popconfirm>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="Thêm phường/xã phụ trách"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="Lưu quy tắc"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
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
          <Form.Item
            name="provinceName"
            label="Tỉnh/Thành phố"
            rules={[{ required: true, message: "Vui lòng nhập tỉnh/thành phố." }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="wardNames"
            label="Phường/Xã phụ trách"
            rules={[{ required: true, message: "Vui lòng chọn ít nhất một phường/xã." }]}
          >
            <HcmWardSelect
              mode="multiple"
              placeholder="Gõ để tìm và chọn nhiều phường/xã"
              allowClear={false}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
