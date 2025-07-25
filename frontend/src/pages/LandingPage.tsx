import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BarChart3, AlertTriangle, Cloud, CheckCircle } from "lucide-react";

const LandingPage = () => {
  const features = [
    {
      icon: Shield,
      title: "Drift Detection",
      description: "Monitor configuration changes and detect infrastructure drift in real-time"
    },
    {
      icon: BarChart3,
      title: "Cost Analytics",
      description: "Track spending patterns and identify cost anomalies across your AWS accounts"
    },
    {
      icon: AlertTriangle,
      title: "Real-time Alerts",
      description: "Get notified instantly when critical changes occur in your infrastructure"
    },
    {
      icon: Cloud,
      title: "Multi-Account Support",
      description: "Monitor multiple AWS accounts from a single, unified dashboard"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-aws rounded-lg">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-aws bg-clip-text text-transparent">
                CloudGuard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <SignInButton mode="modal">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Monitor Your AWS Infrastructure with
            <span className="bg-gradient-aws bg-clip-text text-transparent"> Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Professional AWS monitoring platform for DevOps teams. Track drift, monitor costs, 
            and maintain compliance across all your cloud resources.
          </p>
          <div className="flex items-center justify-center gap-4">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Free Trial
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need to Monitor AWS
            </h2>
            <p className="text-lg text-muted-foreground">
              Built by DevOps engineers, for DevOps engineers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-aws rounded-lg">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Stay Ahead of Infrastructure Issues
              </h2>
              <div className="space-y-4">
                {[
                  "Real-time drift detection and alerting",
                  "Cost anomaly detection with automated reports",
                  "Compliance monitoring and audit trails",
                  "Multi-account dashboard with role-based access",
                  "Integration with Slack, Teams, and PagerDuty"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle>Ready to Get Started?</CardTitle>
                <CardDescription>
                  Join hundreds of DevOps teams monitoring their AWS infrastructure with CloudGuard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignUpButton mode="modal">
                  <Button className="w-full" size="lg">
                    Start Your Free Trial
                  </Button>
                </SignUpButton>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  No credit card required • 14-day free trial
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;