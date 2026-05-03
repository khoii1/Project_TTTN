'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Dropdown, Avatar, theme, Spin } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/auth.store';
import { useRouter } from 'next/navigation';
import { organizationsApi } from '@/features/organizations/organizations.api';
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from '@/lib/api/token-storage';

const { Header } = Layout;

export const AppHeader = () => {
  const { token } = theme.useToken();
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    // Basic init if not initialized from a refresh
    if (!user) {
      const accToken = tokenStorage.getAccessToken();
      if (accToken) {
        try {
          const decoded: any = jwtDecode(accToken);
          setUser({
            id: decoded.sub,
            email: decoded.email,
            firstName: decoded.firstName || 'User',
            lastName: decoded.lastName || '',
            role: decoded.role,
            organizationId: decoded.organizationId,
            createdAt: '',
            updatedAt: '',
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user, setUser]);

  useEffect(() => {
    if (user?.organizationId) {
      organizationsApi.getMe().then((res) => {
        setOrgName(res.name);
      }).catch(console.error);
    }
  }, [user]);

  const handleMenuClick = (e: any) => {
    if (e.key === 'logout') {
      logout();
      router.push('/login');
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: <span className="font-semibold">{user?.firstName} {user?.lastName}</span>,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
    },
  ];

  return (
    <Header style={{ background: token.colorBgContainer }} className="px-6 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <span className="text-gray-600 font-medium">Organization:</span>
        {orgName ? <span className="font-semibold">{orgName}</span> : <Spin size="small" />}
      </div>
      <div className="flex items-center space-x-4">
        <Dropdown menu={{ items: userMenuItems as any, onClick: handleMenuClick }} placement="bottomRight">
          <div className="cursor-pointer flex items-center space-x-2">
            <Avatar icon={<UserOutlined />} className="bg-blue-500" />
            <span className="hidden md:inline">{user?.firstName}</span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};
