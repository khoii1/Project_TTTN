"use client";

import React, { useEffect, useState } from "react";
import { Layout, Dropdown, Avatar, Spin } from "antd";
import type { MenuProps } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/features/auth/auth.store";
import { useRouter } from "next/navigation";
import { organizationsApi } from "@/features/organizations/organizations.api";
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from "@/lib/api/token-storage";
import { authApi } from "@/features/auth/auth.api";
import { GlobalSearch } from "./GlobalSearch";
import { ACTION_LABELS, ENTITY_LABELS } from "@/lib/constants/vi-labels";

const { Header } = Layout;

type JwtUserPayload = {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "ADMIN" | "MANAGER" | "SALES" | "SUPPORT";
  organizationId: string;
};

export const AppHeader = () => {
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    // Basic init if not initialized from a refresh
    if (!user) {
      const accToken = tokenStorage.getAccessToken();
      if (accToken) {
        try {
          const decoded = jwtDecode<JwtUserPayload>(accToken);
          setUser({
            id: decoded.sub,
            email: decoded.email,
            firstName: decoded.firstName || "Người dùng",
            lastName: decoded.lastName || "",
            role: decoded.role,
            organizationId: decoded.organizationId,
            createdAt: "",
            updatedAt: "",
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user, setUser]);

  useEffect(() => {
    if (user?.organizationId) {
      organizationsApi
        .getMe()
        .then((res) => {
          setOrgName(res.name);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Backend logout failed; clearing local session", error);
    } finally {
      logout();
      router.push("/login");
    }
  };

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      void handleLogout();
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: (
        <span className="font-semibold">
          {user?.firstName} {user?.lastName}
        </span>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: ACTION_LABELS.logout,
    },
  ];

  return (
    <Header className="crm-header px-6 flex items-center justify-between">
      <div className="flex min-w-0 items-center space-x-2">
        <span className="text-gray-500 font-medium">
          {ENTITY_LABELS.organization}:
        </span>
        {orgName ? (
          <span className="truncate font-semibold text-gray-800">{orgName}</span>
        ) : (
          <Spin size="small" />
        )}
      </div>
      <div className="mx-6 hidden flex-1 justify-center md:flex">
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center space-x-4">
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
        >
          <div className="h-10 cursor-pointer flex items-center space-x-2 rounded-full border border-gray-200 bg-white px-2.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
            <Avatar size="small" icon={<UserOutlined />} className="bg-blue-600" />
            <span className="hidden md:inline font-medium text-gray-700">
              {user?.firstName}
            </span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};
