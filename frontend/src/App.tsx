import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
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

// Layout
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <>
                <SignedOut>
                  <LandingPage />
                </SignedOut>
                <SignedIn>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </SignedIn>
              </>
            } />
            <Route path="/dashboard" element={
              <SignedIn>
                <Layout>
                  <Dashboard />
                </Layout>
              </SignedIn>
            } />
            <Route path="/resources" element={
              <SignedIn>
                <Layout>
                  <Resources />
                </Layout>
              </SignedIn>
            } />
            <Route path="/drift" element={
              <SignedIn>
                <Layout>
                  <Drift />
                </Layout>
              </SignedIn>
            } />
            <Route path="/costs" element={
              <SignedIn>
                <Layout>
                  <Costs />
                </Layout>
              </SignedIn>
            } />
            <Route path="/connect" element={
              <SignedIn>
                <Layout>
                  <Connect />
                </Layout>
              </SignedIn>
            } />
            <Route path="/settings" element={
              <SignedIn>
                <Layout>
                  <Settings />
                </Layout>
              </SignedIn>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
