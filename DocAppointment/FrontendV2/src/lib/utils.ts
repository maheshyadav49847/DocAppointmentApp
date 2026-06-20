import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import toast from "react-hot-toast"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleApiError(error: any, defaultMessage = "An error occurred") {
  const validationErrors = error.response?.data?.errors || error.response?.data?.extensions?.errors;
  const generalMessage = error.response?.data?.message || error.response?.data?.detail;

  if (validationErrors) {
    Object.values(validationErrors).forEach((errMsgs: any) => {
      if (Array.isArray(errMsgs)) {
        errMsgs.forEach(msg => toast.error(msg));
      } else if (typeof errMsgs === 'string') {
        toast.error(errMsgs);
      }
    });
  } else if (generalMessage) {
    toast.error(generalMessage);
  } else {
    toast.error(defaultMessage);
  }
}
