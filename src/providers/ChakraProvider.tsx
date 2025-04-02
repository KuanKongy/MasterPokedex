
import React from 'react';
import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react';

// Define a simpler theme structure without using extendTheme
const theme = {
  colors: {
    pokebrand: {
      red: '#ea384c',
      darkRed: '#c3303f',
      blue: '#1EAEDB',
      lightBlue: '#33C3F0',
    }
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  }
};

export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BaseChakraProvider>
      {children}
    </BaseChakraProvider>
  );
};
