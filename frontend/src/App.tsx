import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ThemeProvider } from "next-themes";

// Pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import Drift from "./pages/Drift";
import Costs from "./pages/Costs";
import Settings from "./pages/Settings";
import Connect from "./pages/Connect";
import NotFound from "./pages/NotFound";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import AuthLoading from "./components/AuthLoading";

const queryClient = new QueryClient();

// Main app routes component
const AppRoutes = () => {
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return <AuthLoading />;
  }

  return (
    <Routes>
      {/* Public route - Landing page */}
      <Route 
        path="/" 
        element={
          isSignedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />
        } 
      />
      
      {/* Protected routes - require authentication */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resources" 
        element={
          <ProtectedRoute>
            <Resources />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/drift" 
        element={
          <ProtectedRoute>
            <Drift />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/costs" 
        element={
          <ProtectedRoute>
            <Costs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/connect" 
        element={
          <ProtectedRoute>
            <Connect />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
