export type ImportCsvIssueType = 'ERROR' | 'SKIPPED';

export interface ImportCsvIssue {
  row: number;
  field?: string;
  message: string;
  type?: ImportCsvIssueType;
}

export interface ImportCsvResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportCsvIssue[];
}

export interface ParsedCsvRow {
  rowNumber: number;
  values: Record<string, string>;
}
