import { BadRequestException } from '@nestjs/common';
import {
  CasePriority,
  CaseStatus,
  LeadStatus,
  OpportunityStage,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { ImportCsvIssue, ImportCsvResult, ParsedCsvRow } from './import-csv.types';

export const CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 1000;

type EnumLike = Record<string, string>;

export const SYSTEM_IMPORT_FIELDS = new Set([
  'id',
  'organizationId',
  'ownerId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deletedById',
  'restoredAt',
  'restoredById',
  'convertedAt',
  'convertedById',
  'convertedAccountId',
  'convertedContactId',
  'convertedOpportunityId',
  'stageChangedAt',
  'stageChangedById',
  'completedAt',
  'completedById',
  'closedAt',
  'closedById',
]);

export function assertCsvFile(file?: any): Buffer {
  if (!file) {
    throw new BadRequestException('Vui long chon file CSV de import.');
  }

  const originalName = String(file.originalname || '');
  if (!originalName.toLowerCase().endsWith('.csv')) {
    throw new BadRequestException('Chi chap nhan file dinh dang .csv.');
  }

  if (file.size > CSV_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException('File CSV khong duoc vuot qua 5MB.');
  }

  if (!Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException('Khong doc duoc noi dung file CSV.');
  }

  return file.buffer;
}

export function parseCsvBuffer(buffer: Buffer): ParsedCsvRow[] {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const table = parseCsvText(text);

  if (table.length === 0 || table.every((row) => row.every((cell) => !cell.trim()))) {
    throw new BadRequestException('File CSV khong co du lieu.');
  }

  const headers = (table[0] || []).map((header) => header.trim().replace(/^\uFEFF/, ''));
  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new BadRequestException('File CSV thieu dong tieu de cot.');
  }

  const duplicateHeader = headers.find(
    (header, index) => header && headers.indexOf(header) !== index,
  );
  if (duplicateHeader) {
    throw new BadRequestException(`Cot "${duplicateHeader}" bi trung trong file CSV.`);
  }

  const rows = table
    .slice(1)
    .map((cells, index) => ({ cells, rowNumber: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''));

  if (rows.length > CSV_MAX_ROWS) {
    throw new BadRequestException(`Moi lan import toi da ${CSV_MAX_ROWS} dong du lieu.`);
  }

  return rows.map(({ cells, rowNumber }) => {
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        values[header] = (cells[index] || '').trim();
      }
    });
    return { rowNumber, values };
  });
}

export function buildEmptyImportResult(totalRows: number): ImportCsvResult {
  return {
    totalRows,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
  };
}

export function addImportError(
  result: ImportCsvResult,
  row: number,
  field: string | undefined,
  message: string,
) {
  result.failedCount += 1;
  result.errors.push({ row, field, message, type: 'ERROR' });
}

export function addImportSkipped(
  result: ImportCsvResult,
  row: number,
  field: string | undefined,
  message: string,
) {
  result.skippedCount += 1;
  result.errors.push({ row, field, message, type: 'SKIPPED' });
}

export function compactString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function pickAllowedFields(
  row: Record<string, string>,
  allowedFields: string[],
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const field of allowedFields) {
    const value = compactString(row[field]);
    if (value !== undefined) {
      picked[field] = value;
    }
  }
  return picked;
}

export function hasSystemFields(row: Record<string, string>): string | undefined {
  return Object.keys(row).find((field) => SYSTEM_IMPORT_FIELDS.has(field) && row[field]?.trim());
}

export function parseOptionalDate(value?: string): Date | undefined {
  const trimmed = compactString(value);
  if (!trimmed) {
    return undefined;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isValidEmail(value?: string): boolean {
  if (!value) {
    return true;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseOptionalNumber(value?: string): number | undefined {
  const trimmed = compactString(value);
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.replace(/\s/g, '').replace(/,/g, '');
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function normalizeEnumValue<T extends EnumLike>(
  rawValue: string | undefined,
  enumObject: T,
  labelMap: Record<string, T[keyof T]>,
): T[keyof T] | undefined {
  const value = compactString(rawValue);
  if (!value) {
    return undefined;
  }

  const upper = value.trim().toUpperCase();
  if (Object.values(enumObject).includes(upper as T[keyof T])) {
    return upper as T[keyof T];
  }

  return labelMap[normalizeLabel(value)];
}

export function enumValues(enumObject: EnumLike): string {
  return Object.values(enumObject).join(', ');
}

export const leadStatusLabels: Record<string, LeadStatus> = {
  moi: LeadStatus.NEW,
  new: LeadStatus.NEW,
  'da lien he': LeadStatus.CONTACTED,
  'lien he': LeadStatus.CONTACTED,
  contacted: LeadStatus.CONTACTED,
  'dang cham soc': LeadStatus.NURTURING,
  'cham soc': LeadStatus.NURTURING,
  nurturing: LeadStatus.NURTURING,
  'du dieu kien': LeadStatus.QUALIFIED,
  qualified: LeadStatus.QUALIFIED,
  'khong du dieu kien': LeadStatus.UNQUALIFIED,
  unqualified: LeadStatus.UNQUALIFIED,
  'da chuyen doi': LeadStatus.CONVERTED,
  converted: LeadStatus.CONVERTED,
};

export const opportunityStageLabels: Record<string, OpportunityStage> = {
  'xac dinh nhu cau': OpportunityStage.QUALIFY,
  'tham dinh': OpportunityStage.QUALIFY,
  qualify: OpportunityStage.QUALIFY,
  'de xuat': OpportunityStage.PROPOSE,
  propose: OpportunityStage.PROPOSE,
  'dam phan': OpportunityStage.NEGOTIATE,
  negotiate: OpportunityStage.NEGOTIATE,
  'chot thanh cong': OpportunityStage.CLOSED_WON,
  thang: OpportunityStage.CLOSED_WON,
  'closed won': OpportunityStage.CLOSED_WON,
  'chot that bai': OpportunityStage.CLOSED_LOST,
  thua: OpportunityStage.CLOSED_LOST,
  'closed lost': OpportunityStage.CLOSED_LOST,
};

export const taskStatusLabels: Record<string, TaskStatus> = {
  'chua bat dau': TaskStatus.NOT_STARTED,
  'not started': TaskStatus.NOT_STARTED,
  'dang thuc hien': TaskStatus.IN_PROGRESS,
  'dang lam': TaskStatus.IN_PROGRESS,
  'in progress': TaskStatus.IN_PROGRESS,
  'hoan thanh': TaskStatus.COMPLETED,
  completed: TaskStatus.COMPLETED,
  'da huy': TaskStatus.CANCELLED,
  cancelled: TaskStatus.CANCELLED,
};

export const taskPriorityLabels: Record<string, TaskPriority> = {
  thap: TaskPriority.LOW,
  low: TaskPriority.LOW,
  'binh thuong': TaskPriority.NORMAL,
  normal: TaskPriority.NORMAL,
  cao: TaskPriority.HIGH,
  high: TaskPriority.HIGH,
};

export const caseStatusLabels: Record<string, CaseStatus> = {
  moi: CaseStatus.NEW,
  new: CaseStatus.NEW,
  'dang xu ly': CaseStatus.WORKING,
  working: CaseStatus.WORKING,
  'da giai quyet': CaseStatus.RESOLVED,
  resolved: CaseStatus.RESOLVED,
  'da dong': CaseStatus.CLOSED,
  closed: CaseStatus.CLOSED,
};

export const casePriorityLabels: Record<string, CasePriority> = {
  thap: CasePriority.LOW,
  low: CasePriority.LOW,
  'trung binh': CasePriority.MEDIUM,
  medium: CasePriority.MEDIUM,
  cao: CasePriority.HIGH,
  high: CasePriority.HIGH,
  'khan cap': CasePriority.URGENT,
  urgent: CasePriority.URGENT,
};

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new BadRequestException('File CSV co dau ngoac kep khong hop le.');
  }

  row.push(cell);
  rows.push(row);

  return rows;
}
