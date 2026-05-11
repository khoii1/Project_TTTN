"use client";

import React, { ReactNode } from "react";
import { Layout } from "antd";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

const { Content } = Layout;

interface DashboardShellProps {
  children: ReactNode;
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
  return (
    <Layout className="crm-app-shell min-h-screen">
      <AppSidebar />
      <Layout>
        <AppHeader />
        <Content className="crm-content h-[calc(100vh-64px)] overflow-auto p-6">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
