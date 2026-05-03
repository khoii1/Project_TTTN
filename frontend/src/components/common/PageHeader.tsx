import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export const PageHeader = ({ title, subtitle, action, onBack, showBack }: PageHeaderProps) => {
  const router = useRouter();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        {showBack && (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
        )}
        <div>
          <Title level={3} className="!mb-0">{title}</Title>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div>{action}</div>
    </div>
  );
};
