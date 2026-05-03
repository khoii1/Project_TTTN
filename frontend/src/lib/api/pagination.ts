/**
 * Pagination Helper - Handles backend paginated responses
 *
 * Backend returns:
 * {
 *   data: T[],
 *   meta: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 *
 * Or raw array for legacy endpoints.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: PaginationMeta;
}

export type PaginatedArray<T> = T[] & {
  meta?: PaginationMeta;
};

/**
 * Parse a backend response that may be paginated or a raw array.
 * Raw-array fallback remains for legacy endpoints.
 */
export function parsePaginatedResponse<T>(response: unknown): {
  data: T[];
  meta: PaginationMeta | null;
} {
  if (response && typeof response === "object" && "data" in response) {
    const typedResponse = response as { data?: unknown; meta?: PaginationMeta };

    if (Array.isArray(typedResponse.data)) {
      return {
        data: typedResponse.data as T[],
        meta: typedResponse.meta ?? null,
      };
    }
  }

  if (Array.isArray(response)) {
    return {
      data: response as T[],
      meta: (response as PaginatedArray<T>).meta ?? null,
    };
  }

  return {
    data: [],
    meta: null,
  };
}

export function toPaginatedArray<T>(response: unknown): PaginatedArray<T> {
  const parsed = parsePaginatedResponse<T>(response);
  const items = parsed.data as PaginatedArray<T>;

  if (parsed.meta) {
    Object.defineProperty(items, "meta", {
      value: parsed.meta,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  }

  return items;
}

export function getDataArray<T>(response: unknown): T[] {
  return parsePaginatedResponse<T>(response).data;
}

export function getPaginationMeta(response: unknown): PaginationMeta | null {
  return parsePaginatedResponse<unknown>(response).meta;
}
