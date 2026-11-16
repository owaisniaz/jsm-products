export const ErrorCodes = {
  TOKEN_EXPIRED: { status: 401, message: 'Token has expired' },
  TOKEN_INVALID: { status: 401, message: 'Invalid token' },
  TOKEN_NOT_ACTIVE: { status: 401, message: 'Token is not active' },
  TOKEN_WRONG_TYPE: { status: 401, message: 'Invalid token type' },
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  INVALID_ID: { status: 400, message: 'Invalid ID' },
  BAD_REQUEST: { status: 400, message: 'Bad request' },
  NOT_FOUND: { status: 404, message: 'Not found' },
  DUPLICATE_FIELD: { status: 409, message: 'Duplicate field' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'Payload too large' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
  GROUP_NOT_FOUND: { status: 404, message: 'Group not found' },
  GROUP_NAME_EXISTS: {
    status: 409,
    message: 'You already have a group with this name',
  },
  // Companies
  COMPANY_NOT_FOUND: { status: 404, message: 'Company not found' },
  COMPANY_CODE_EXISTS: {
    status: 409,
    message: 'This company code is already in use',
  },
  COMPANY_NAME_EXISTS: {
    status: 409,
    message: 'You already have a company with this name in this group',
  },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
