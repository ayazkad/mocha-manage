import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { POSProvider } from "./contexts/POSContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import POS from "./pages/POS";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <POSProvider>
          <Toaster />
          <Sonner
            position="top-center"
            toastOptions={{
              style: {
                marginTop: 'max(env(safe-area-inset-top), 44px)',
              },
            }}
          />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/admin" element={<Admin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </POSProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
