export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function calculatePagination(params: PaginationParams) {
  let page = params.page || DEFAULT_PAGE;
  let limit = params.limit || DEFAULT_LIMIT;

  if (page < 1) page = DEFAULT_PAGE;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function calculateMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
