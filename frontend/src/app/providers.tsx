"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { useEffect } from "react";
import type { ReactNode } from "react";

type ApiErrorNotificationDetail = {
  title: string;
  description: string;
};

function ApiNotificationBridge() {
  const { notification } = AntdApp.useApp();

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const { title, description } = (
        event as CustomEvent<ApiErrorNotificationDetail>
      ).detail;

      notification.error({
        title,
        description,
      });
    };

    window.addEventListener("crm:api-error", handleApiError);
    return () => window.removeEventListener("crm:api-error", handleApiError);
  }, [notification]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorSuccess: "#16a34a",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorInfo: "#2563eb",
          colorText: "#111827",
          colorTextSecondary: "#64748b",
          colorTextPlaceholder: "#334155",
          colorBorder: "#cbd5e1",
          colorBorderSecondary: "#cbd5e1",
          colorBgLayout: "#e6ebf2",
          colorBgContainer: "#ffffff",
          borderRadius: 8,
          boxShadowSecondary:
            "0 12px 30px rgba(15, 23, 42, 0.095), 0 2px 10px rgba(15, 23, 42, 0.055)",
        },
        components: {
          Button: {
            controlHeight: 36,
            borderRadius: 8,
            primaryShadow: "0 6px 14px rgba(37, 99, 235, 0.16)",
          },
          Card: {
            borderRadiusLG: 8,
            headerBg: "#ffffff",
          },
          Input: {
            borderRadius: 8,
            activeBorderColor: "#2563eb",
            hoverBorderColor: "#93c5fd",
          },
          Select: {
            borderRadius: 8,
            optionSelectedBg: "#eff6ff",
          },
          Table: {
            headerBg: "#e8edf5",
            headerColor: "#334155",
            rowHoverBg: "#f8fafc",
            borderColor: "#cbd5e1",
          },
          Tabs: {
            itemSelectedColor: "#2563eb",
            inkBarColor: "#2563eb",
          },
          Tag: {
            borderRadiusSM: 999,
          },
        },
      }}
    >
      <AntdApp>
        <ApiNotificationBridge />
        {children}
      </AntdApp>
    </ConfigProvider>
  );
}
