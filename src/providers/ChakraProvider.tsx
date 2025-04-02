
import React from 'react';
import { 
  ChakraProvider as BaseChakraProvider, 
  ChakraProviderProps
} from '@chakra-ui/react';

// Create a simplified provider without theme customization
export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Basic provider configuration that doesn't rely on extendTheme
  const providerProps: ChakraProviderProps = {
    resetCSS: true,
    portalZIndex: 40
  };

  return (
    <BaseChakraProvider {...providerProps}>
      {children}
    </BaseChakraProvider>
  );
};
