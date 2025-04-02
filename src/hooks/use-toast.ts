
import { useToast as useChakraToast } from '@chakra-ui/react';

export const useToast = () => {
  const chakraToast = useChakraToast();

  return {
    toast: (options: {
      title?: string;
      description?: string;
      status?: 'success' | 'error' | 'warning' | 'info';
      variant?: 'destructive';
    }) => {
      const status = options.variant === 'destructive' ? 'error' : options.status || 'success';
      
      chakraToast({
        title: options.title,
        description: options.description,
        status: status as any,
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
};
