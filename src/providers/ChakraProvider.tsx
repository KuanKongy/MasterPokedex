
import React from 'react';
import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react';

// Simple provider without theme customization since extendTheme is not available
export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BaseChakraProvider>
      {children}
    </BaseChakraProvider>
  );
};
