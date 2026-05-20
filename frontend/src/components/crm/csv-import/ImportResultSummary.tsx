"use client";

import { Alert, Statistic } from "antd";
import type { ImportCsvResult } from "./types";

type ImportResultSummaryProps = {
  result: ImportCsvResult;
};

export function ImportResultSummary({ result }: ImportResultSummaryProps) {
  const hasIssues = result.failedCount > 0 || result.skippedCount > 0;

  return (
    <div className="space-y-3">
      <Alert
        type={hasIssues ? "warning" : "success"}
        showIcon
        message={
          hasIssues
            ? "Import hoàn tất với một số dòng cần xem lại"
            : "Import CSV thành công"
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Statistic title="Tổng dòng" value={result.totalRows} />
        <Statistic title="Thành công" value={result.successCount} />
        <Statistic title="Bỏ qua" value={result.skippedCount} />
        <Statistic title="Lỗi" value={result.failedCount} />
      </div>
    </div>
  );
}
