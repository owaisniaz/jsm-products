export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T | null;
  // error: null;
  // timestamp: string;
  // path: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  data: null;
  error: {
    code: string;
    details: string[] | null;
  };
  timestamp: string;
  path: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
