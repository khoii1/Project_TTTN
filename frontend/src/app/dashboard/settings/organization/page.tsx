'use client';

import { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message } from 'antd';
import { PageHeader } from '@/components/common/PageHeader';
import { organizationsApi } from '@/features/organizations/organizations.api';
import { Organization } from '@/features/auth/auth.types';

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        const data = await organizationsApi.getMe();
        setOrg(data);
      } catch (error) {
        message.error('Failed to load organization settings');
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>;
  if (!org) return <div>Organization not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Settings" />

      <Card className="shadow-sm max-w-3xl">
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="Organization ID">{org.id}</Descriptions.Item>
          <Descriptions.Item label="Organization Name">
            <span className="font-semibold text-lg">{org.name}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Created At">{new Date(org.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{new Date(org.updatedAt).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
