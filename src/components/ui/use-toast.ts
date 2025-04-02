
import { useToast } from "@/hooks/use-toast";

// Re-export useToast
export { useToast };

// Create a standalone toast function that can be imported directly
export const toast = (options: {
  title?: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  variant?: 'destructive';
}) => {
  // This is a simple wrapper for direct imports
  // The actual toast will be called within components using useToast hook
  const toastFn = useToast();
  return toastFn.toast(options);
};
