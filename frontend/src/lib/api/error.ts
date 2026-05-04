type ErrorWithResponse = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const err = error as ErrorWithResponse;
  const msg = err.response?.data?.message;

  if (Array.isArray(msg)) {
    return msg.join(", ");
  }

  if (typeof msg === "string" && msg.trim().length > 0) {
    return msg;
  }

  return fallbackMessage;
};
