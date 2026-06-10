"use client";

import type { ReactNode } from "react";
import { Button, Card, Descriptions, Empty, Space } from "antd";
import type { ButtonProps } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

type RecordHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  subtitleItems?: ReactNode[];
  icon: ReactNode;
  actions?: ReactNode;
  testId?: string;
};

type StagePathProps<T extends string> = {
  stages: T[];
  currentStage: T;
  getLabel: (stage: T) => string;
  onChange?: (index: number) => void;
  testIdPrefix?: string;
};

type DetailSectionCardProps = {
  title: string;
  children: ReactNode;
};

type RecordInfoCardProps = {
  title: string;
  children: ReactNode;
};

type RecordInfoFieldProps = {
  label: string;
  children: ReactNode;
};

type RecordDetailGridProps = {
  left: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
};

type RelatedListCardProps<T> = {
  title: string;
  items: T[];
  emptyDescription: string;
  renderItem: (item: T) => ReactNode;
};

type EmptyStateCardProps = {
  title: string;
  description: string;
};

type HeaderButtonProps = ButtonProps & {
  children: ReactNode;
};

export const RecordHeader = ({
  eyebrow,
  title,
  subtitleItems = [],
  icon,
  actions,
  testId = "record-header",
}: RecordHeaderProps) => {
  const router = useRouter();

  return (
    <div className="crm-page-header px-6 py-5" data-testid={testId}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            aria-label="Quay lại"
            className="mt-1"
          />
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xl text-white">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {eyebrow}
            </div>
            <h1 className="m-0 truncate text-2xl font-bold text-gray-950">
              {title}
            </h1>
            {subtitleItems.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {subtitleItems
                  .filter((item) => item !== undefined && item !== null && item !== "")
                  .map((item, index) => (
                    <span key={index}>{item}</span>
                  ))}
              </div>
            )}
          </div>
        </div>
        {actions && <Space wrap className="justify-end">{actions}</Space>}
      </div>
    </div>
  );
};

export const HeaderButton = ({ children, ...props }: HeaderButtonProps) => (
  <Button {...props}>{children}</Button>
);

export const StagePath = <T extends string>({
  stages,
  currentStage,
  getLabel,
  onChange,
  testIdPrefix = "record-stage",
}: StagePathProps<T>) => {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <Card className="shadow-sm" data-testid={`${testIdPrefix}-path`}>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {stages.map((stage, index) => {
          const isCurrent = stage === currentStage;
          const isComplete = currentIndex >= 0 && index < currentIndex;

          return (
            <button
              key={stage}
              type="button"
              data-testid={`${testIdPrefix}-${stage}`}
              onClick={() => onChange?.(index)}
              disabled={!onChange}
              className={[
                "min-w-[150px] flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-blue-200",
                isCurrent
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isComplete
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50",
                !onChange ? "cursor-default" : "",
              ].join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              {getLabel(stage)}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export const DetailSectionCard = ({ title, children }: DetailSectionCardProps) => (
  <Card title={title} size="small" className="shadow-sm">
    <Descriptions
      column={1}
      bordered
      size="small"
      styles={{ label: { width: 160 } }}
    >
      {children}
    </Descriptions>
  </Card>
);

export const RecordInfoCard = ({ title, children }: RecordInfoCardProps) => (
  <Card title={title} size="small" className="shadow-sm">
    <div className="record-info-fields">{children}</div>
  </Card>
);

export const RecordInfoField = ({ label, children }: RecordInfoFieldProps) => (
  <div className="record-info-field">
    <div className="record-info-label">{label}</div>
    <div className="record-info-value">{children}</div>
  </div>
);

export const RecordDetailGrid = ({ left, middle, right }: RecordDetailGridProps) => (
  <div className="record-detail-grid">
    <section className="space-y-4">{left}</section>
    {middle && <section>{middle}</section>}
    {right && (
      <aside className="record-detail-sidebar space-y-4">{right}</aside>
    )}
  </div>
);

export const RelatedListCard = <T,>({
  title,
  items,
  emptyDescription,
  renderItem,
}: RelatedListCardProps<T>) => (
  <Card title={`${title} (${items.length})`} size="small" className="shadow-sm">
    {items.length ? (
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <div key={index} className="py-3 first:pt-0 last:pb-0">
            {renderItem(item)}
          </div>
        ))}
      </div>
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
    )}
  </Card>
);

export const EmptyStateCard = ({ title, description }: EmptyStateCardProps) => (
  <Card title={title} size="small" className="shadow-sm">
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
  </Card>
);
