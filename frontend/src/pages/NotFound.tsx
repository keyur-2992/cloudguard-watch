import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Cloud } from "lucide-react";
import AuthLoading from "@/components/AuthLoading";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return <AuthLoading />;
  }

  // If user is not signed in, redirect to landing page
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard">
        <Card className="max-w-md mx-auto shadow-soft">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-aws rounded-full mx-auto mb-4">
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist. Please sign in to access CloudGuard.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For authenticated users, show a proper 404 page with navigation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md mx-auto shadow-soft">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl font-bold text-muted-foreground mb-2">404</CardTitle>
          <CardTitle className="text-xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            Need help? Contact support or check our documentation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
