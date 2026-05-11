"use client";

import { Card, Descriptions, Empty } from "antd";
import type { ReactNode } from "react";
import { EMPTY_STATE_LABELS } from "@/lib/constants/vi-labels";

type SectionCardProps = {
  title: string;
  children: ReactNode;
};

type EmptyStateProps = {
  description?: string;
};

export const emptyValue = (value?: ReactNode) => value || "-";

export const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : "-";

export const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : "-";

export const SectionCard = ({ title, children }: SectionCardProps) => (
  <Card title={title} className="shadow-sm" size="small">
    <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
      {children}
    </Descriptions>
  </Card>
);

export const RelatedEmpty = ({
  description = EMPTY_STATE_LABELS.noRecords,
}: EmptyStateProps) => (
  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
);
