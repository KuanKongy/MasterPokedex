
import React from 'react';
import { ChakraProvider as BaseChakraProvider, ChakraProviderProps, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    pokebrand: {
      red: '#ea384c',
      darkRed: '#c3303f',
      blue: '#1EAEDB',
      lightBlue: '#33C3F0',
    }
  }
});

const chakraProps: Partial<ChakraProviderProps> = {
  theme,
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
