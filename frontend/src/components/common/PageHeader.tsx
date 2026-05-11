import React from "react";
import { Button, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export const PageHeader = ({
  title,
  subtitle,
  action,
  onBack,
  showBack,
}: PageHeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="crm-page-header mb-6 flex flex-col items-stretch justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center space-x-4">
        {showBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          />
        )}
        <div className="min-w-0">
          <Title level={3} className="!mb-0">
            {title}
          </Title>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
};
