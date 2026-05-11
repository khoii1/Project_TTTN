"use client";

import React from "react";
import { Layout, Menu } from "antd";
import { useRouter, usePathname } from "next/navigation";
import {
  DashboardOutlined,
  UsergroupAddOutlined,
  BankOutlined,
  ContactsOutlined,
  LineChartOutlined,
  CheckSquareOutlined,
  ExceptionOutlined,
  SettingOutlined,
  TeamOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/features/auth/auth.store";
import { ENTITY_LABELS } from "@/lib/constants/vi-labels";

const { Sider } = Layout;

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const getSelectedKey = () => {
    if (pathname === "/dashboard") return "/dashboard";
    const parts = pathname.split("/");
    if (parts.length > 2) {
      return `/dashboard/${parts[2]}`;
    }
    return pathname;
  };

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: ENTITY_LABELS.dashboard,
    },
    {
      key: "/dashboard/leads",
      icon: <UsergroupAddOutlined />,
      label: ENTITY_LABELS.leads,
    },
    {
      key: "/dashboard/accounts",
      icon: <BankOutlined />,
      label: ENTITY_LABELS.accounts,
    },
    {
      key: "/dashboard/contacts",
      icon: <ContactsOutlined />,
      label: ENTITY_LABELS.contacts,
    },
    {
      key: "/dashboard/opportunities",
      icon: <LineChartOutlined />,
      label: ENTITY_LABELS.opportunities,
    },
    {
      key: "/dashboard/tasks",
      icon: <CheckSquareOutlined />,
      label: ENTITY_LABELS.tasks,
    },
    {
      key: "/dashboard/cases",
      icon: <ExceptionOutlined />,
      label: ENTITY_LABELS.cases,
    },
    {
      key: "/dashboard/recycle-bin",
      icon: <DeleteOutlined />,
      label: ENTITY_LABELS.recycleBin,
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            key: "/dashboard/users",
            icon: <TeamOutlined />,
            label: ENTITY_LABELS.users,
          },
        ]
      : []),
    {
      key: "/dashboard/settings/organization",
      icon: <SettingOutlined />,
      label: ENTITY_LABELS.settings,
    },
  ];

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={264}
      theme="light"
      className="crm-sidebar h-screen sticky top-0"
    >
      <div className="crm-sidebar-logo h-16 flex items-center justify-center border-b border-gray-200">
        <span className="text-xl font-bold text-blue-700">CRM Pro</span>
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
        onClick={({ key }) => router.push(key)}
        className="mt-4 border-r-0"
      />
    </Sider>
  );
};
