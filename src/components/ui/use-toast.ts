
import { useToast, showToast } from "@/hooks/use-toast";

// Re-export useToast
export { useToast };

// Create a standalone toast function that can be imported directly
export const toast = showToast;
