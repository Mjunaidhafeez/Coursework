const firstFromValue = (value) => {
  if (Array.isArray(value)) return value.length ? String(value[0]) : "";
  if (value && typeof value === "object") {
    const nested = Object.values(value);
    for (const item of nested) {
      const found = firstFromValue(item);
      if (found) return found;
    }
    return "";
  }
  return value ? String(value) : "";
};

export const extractFieldErrors = (errorData) => {
  const payload = errorData?.errors || errorData;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  const result = {};
  Object.entries(payload).forEach(([field, value]) => {
    const message = firstFromValue(value);
    if (message) result[field] = message;
  });
  return result;
};

export const extractApiErrorMessage = (error) => {
  const data = error?.response?.data;
  if (data?.message) return data.message;

  const fieldErrors = extractFieldErrors(data);
  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) return firstFieldError;

  if (data?.detail) return String(data.detail);
  if (typeof data === "string" && data.trim()) return data;
  return "Request failed. Please check your input and try again.";
};
