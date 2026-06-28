
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
import { BallPrefProvider } from "./prefs/BallPrefContext";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
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
import Moves from "./pages/Moves";
import MoveDetail from "./pages/MoveDetail";
import Abilities from "./pages/Abilities";
import AbilityDetail from "./pages/AbilityDetail";
import TypeChart from "./pages/TypeChart";
import TypeDetail from "./pages/TypeDetail";
import Evolutions from "./pages/Evolutions";
import MegaEvolutions from "./pages/MegaEvolutions";
import Gigantamax from "./pages/Gigantamax";
import Locations from "./pages/Locations";
import LocationDetailPage from "./pages/LocationDetailPage";
import SearchResults from "./pages/SearchResults";

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
        <BallPrefProvider>
          <AuthProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <ScrollToTop />
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/pokemon/:id" element={<PokemonDetail />} />
                    <Route path="/map" element={<Map />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/locations/:id" element={<LocationDetailPage />} />
                    <Route path="/moves" element={<Moves />} />
                    <Route path="/moves/:idOrName" element={<MoveDetail />} />
                    <Route path="/abilities" element={<Abilities />} />
                    <Route path="/abilities/:idOrName" element={<AbilityDetail />} />
                    <Route path="/types" element={<TypeChart />} />
                    <Route path="/types/:name" element={<TypeDetail />} />
                    <Route path="/evolutions" element={<Evolutions />} />
                    <Route path="/mega-evolutions" element={<MegaEvolutions />} />
                    <Route path="/gigantamax" element={<Gigantamax />} />
                    <Route path="/search" element={<SearchResults />} />
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
        </BallPrefProvider>
        </SpritePrefProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
