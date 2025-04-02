
import React from 'react';
import { ChakraProvider as BaseChakraProvider, extendTheme } from '@chakra-ui/react';

// Create a theme with custom colors
const theme = {
  colors: {
    pokebrand: {
      red: '#ea384c',
      darkRed: '#c3303f',
      blue: '#1EAEDB',
      lightBlue: '#33C3F0',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      variants: {
        primary: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
        },
      },
    },
  },
};

export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BaseChakraProvider theme={extendTheme(theme)}>
      {children}
    </BaseChakraProvider>
  );
};
