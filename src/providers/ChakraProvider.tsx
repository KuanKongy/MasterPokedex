
import React from 'react';
import { ChakraProvider as BaseChakraProvider, ChakraProviderProps } from '@chakra-ui/react';

const chakraProps: ChakraProviderProps = {
  value: {
    colors: {
      pokebrand: {
        red: '#ea384c',
        darkRed: '#c3303f',
        blue: '#1EAEDB',
        lightBlue: '#33C3F0',
      }
    }
  },
  colorModeManager: {
    get: () => 'light',
    set: () => {},
    type: 'localStorage'
  }
};

export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BaseChakraProvider {...chakraProps}>
      {children}
    </BaseChakraProvider>
  );
};
