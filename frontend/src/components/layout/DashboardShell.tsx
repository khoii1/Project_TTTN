'use client';

import React, { ReactNode } from 'react';
import { Layout } from 'antd';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

const { Content } = Layout;

interface DashboardShellProps {
  children: ReactNode;
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
  return (
    <Layout className="min-h-screen">
      <AppSidebar />
      <Layout>
        <AppHeader />
        <Content className="p-6 overflow-auto bg-gray-50 h-[calc(100vh-64px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
