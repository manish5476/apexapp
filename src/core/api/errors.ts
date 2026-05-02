import { AxiosError } from 'axios';

export type ApiError = {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
  response?: {
    status: number;
    data: unknown;
  };
};

export function toApiError(error: AxiosError): ApiError {
  const statusCode = error.response?.status ?? 0;
  const data = error.response?.data as { message?: string; code?: string } | undefined;

  return {
    statusCode,
    message: data?.message || error.message || 'Unexpected API error',
    code: data?.code,
    details: error.response?.data,
    // Backward compatibility: several screens still read err.response.*
    response: {
      status: statusCode,
      data: error.response?.data,
    },
  };
}
