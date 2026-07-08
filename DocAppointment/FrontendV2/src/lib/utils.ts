import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import toast from "react-hot-toast"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleApiError(error: any, defaultMessage = "An error occurred") {
  const status = error.response?.status;
  const validationErrors = error.response?.data?.errors || error.response?.data?.extensions?.errors;
  const generalMessage = error.response?.data?.message || error.response?.data?.detail;

  // Do not show toasts for standard validation errors because they should be handled by inline form errors
  if (validationErrors && (status === 400 || status === 422)) {
    return;
  }

  if (generalMessage) {
    toast.error(generalMessage);
  } else {
    toast.error(defaultMessage);
  }
}
