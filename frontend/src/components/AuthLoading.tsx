import { Cloud } from "lucide-react";

const AuthLoading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard">
      <div className="text-center">
        {/* CloudGuard Logo */}
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-aws rounded-full mx-auto mb-6 animate-pulse">
          <Cloud className="w-8 h-8 text-white" />
        </div>
        
        {/* Brand Name */}
        <h1 className="text-2xl font-bold bg-gradient-aws bg-clip-text text-transparent mb-4">
          CloudGuard
        </h1>
        
        {/* Loading Spinner */}
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border border-primary/20 mx-auto"></div>
        </div>
        
        {/* Loading Text */}
        <p className="text-muted-foreground animate-pulse">
          Initializing CloudGuard...
        </p>
        
        {/* Loading Dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoading; 