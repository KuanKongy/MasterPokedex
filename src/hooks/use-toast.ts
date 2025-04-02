
import { useCallback } from 'react';
import { toast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  variant?: 'destructive';
}

export const useToast = () => {
  const showToast = useCallback((options: ToastOptions) => {
    const { title, description, status, variant } = options;

    if (variant === 'destructive' || status === 'error') {
      toast.error(title, {
        description,
      });
      return;
    }

    if (status === 'warning') {
      toast.warning(title, {
        description,
      });
      return;
    }

    if (status === 'info') {
      toast.info(title, {
        description,
      });
      return;
    }

    // Default is success
    toast.success(title, {
      description,
    });
  }, []);

  return {
    toast: showToast,
  };
};

// For direct import
export const showToast = (options: ToastOptions) => {
  const { title, description, status, variant } = options;

  if (variant === 'destructive' || status === 'error') {
    toast.error(title, {
      description,
    });
    return;
  }

  if (status === 'warning') {
    toast.warning(title, {
      description,
    });
    return;
  }

  if (status === 'info') {
    toast.info(title, {
      description,
    });
    return;
  }

  // Default is success
  toast.success(title, {
    description,
  });
};
