export type ImportCsvIssueType = "ERROR" | "SKIPPED";

export type ImportCsvIssue = {
  row: number;
  field?: string;
  message: string;
  type?: ImportCsvIssueType;
};

export type ImportCsvResult = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportCsvIssue[];
};
