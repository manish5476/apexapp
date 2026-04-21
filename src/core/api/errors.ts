import { AxiosError } from 'axios';

export type ApiError = {
  statusCode: number;
  message: string;
  details?: unknown;
};

export function toApiError(error: AxiosError): ApiError {
  const statusCode = error.response?.status ?? 0;
  const data = error.response?.data as { message?: string } | undefined;

  return {
    statusCode,
    message: data?.message || error.message || 'Unexpected API error',
    details: error.response?.data,
  };
}
