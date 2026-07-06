"use client";

import type { ReactNode } from "react";
import { Card } from "antd";
import { PageHeader } from "./PageHeader";

type FormPageSize = "compact" | "default" | "wide";

interface FormPageLayoutProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  size?: FormPageSize;
  showBack?: boolean;
  onBack?: () => void;
}

const sizeClasses: Record<FormPageSize, string> = {
  compact: "max-w-[800px]",
  default: "max-w-[960px]",
  wide: "max-w-[1160px]",
};

export function FormPageLayout({
  title,
  subtitle,
  action,
  children,
  size = "default",
  showBack = true,
  onBack,
}: FormPageLayoutProps) {
  return (
    <div
      className={`mx-auto w-full min-w-0 pb-8 ${sizeClasses[size]}`}
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={action}
        showBack={showBack}
        onBack={onBack}
      />
      <Card
        className="w-full overflow-hidden shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </Card>
    </div>
  );
}
