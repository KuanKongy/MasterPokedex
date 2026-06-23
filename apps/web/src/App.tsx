
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import { SpritePrefProvider } from "./prefs/SpritePrefContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import PokemonDetail from "./pages/PokemonDetail";
import NotFound from "./pages/NotFound";
import Map from "./pages/Map";
import Trainer from "./pages/Trainer";
import Items from "./pages/Items";
import PokemonFilter from "./pages/PokemonFilter";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SpritePrefProvider>
          <AuthProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/pokemon/:id" element={<PokemonDetail />} />
                    <Route path="/map" element={<Map />} />
                    <Route element={<RequireAuth />}>
                      <Route path="/trainer" element={<Trainer />} />
                    </Route>
                    <Route path="/items" element={<Items />} />
                    <Route path="/pokemon-filter" element={<PokemonFilter />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                  </Route>
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </BrowserRouter>
          </AuthProvider>
        </SpritePrefProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
