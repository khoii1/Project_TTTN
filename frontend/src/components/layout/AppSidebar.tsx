'use client';

import React from 'react';
import { Layout, Menu } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
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
} from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/auth.store';

const { Sider } = Layout;

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const getSelectedKey = () => {
    if (pathname === '/dashboard') return '/dashboard';
    const parts = pathname.split('/');
    if (parts.length > 2) {
      return `/dashboard/${parts[2]}`;
    }
    return pathname;
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/dashboard/leads', icon: <UsergroupAddOutlined />, label: 'Leads' },
    { key: '/dashboard/accounts', icon: <BankOutlined />, label: 'Accounts' },
    { key: '/dashboard/contacts', icon: <ContactsOutlined />, label: 'Contacts' },
    { key: '/dashboard/opportunities', icon: <LineChartOutlined />, label: 'Opportunities' },
    { key: '/dashboard/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
    { key: '/dashboard/cases', icon: <ExceptionOutlined />, label: 'Cases' },
    { key: '/dashboard/recycle-bin', icon: <DeleteOutlined />, label: 'Recycle Bin' },
    ...(user?.role === 'ADMIN' ? [{ key: '/dashboard/users', icon: <TeamOutlined />, label: 'Users' }] : []),
    { key: '/dashboard/settings/organization', icon: <SettingOutlined />, label: 'Settings' },
  ];

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      theme="light"
      className="border-r border-gray-200 h-screen sticky top-0"
    >
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <span className="text-xl font-bold text-blue-600">CRM Pro</span>
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
