
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ChakraProvider } from './providers/ChakraProvider'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ChakraProvider>
    <App />
  </ChakraProvider>
);
