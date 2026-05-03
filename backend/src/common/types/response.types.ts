export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedResponse<T = any> {
  data!: T[];
  meta!: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
}
