export type ApiResponse<T> = {
  status: string;
  message?: string;
  data: T;
};

export type ListResponse<T> = {
  status: string;
  results: number;
  total?: number;
  page?: number;
  totalPages?: number;
  data: T[];
};
