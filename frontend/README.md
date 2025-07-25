# CloudGuard Frontend

**Modern React SaaS Application for AWS Infrastructure Monitoring**

Professional, responsive frontend application built with React 18, TypeScript, Vite, and shadcn/ui for comprehensive AWS cloud infrastructure monitoring, drift detection, and cost analytics.

## 🏗️ **Architecture Overview**

CloudGuard frontend is a modern single-page application (SPA) that provides:

- **🔐 Authentication** - Clerk-based user authentication with JWT tokens
- **🎯 Protected Routing** - Route-level authentication and 404 handling
- **📊 Real-time Data** - TanStack Query for efficient data fetching and caching
- **🎨 Modern UI** - shadcn/ui components with Tailwind CSS styling
- **📱 Responsive Design** - Mobile-first design that works on all devices
- **🌙 Theme Support** - Dark/light mode with system preference detection
- **⚡ Fast Navigation** - React Router for client-side routing
- **📈 Data Visualization** - Recharts for interactive charts and graphs

### **Tech Stack**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and optimized builds)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Clerk React SDK with JWT
- **Data Fetching**: TanStack Query (React Query v5)
- **Routing**: React Router DOM v6
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React (beautiful icon library)
- **State Management**: React hooks + TanStack Query cache

---

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js 18+** and npm
- **Backend API** running on `http://localhost:3001`
- **Clerk account** configured for authentication

### **1. Installation**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### **2. Environment Configuration**

Create a `.env.local` file in the frontend directory:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."

# API Configuration
VITE_API_URL="http://localhost:3001"

# App Configuration
VITE_APP_NAME="CloudGuard"
VITE_APP_DESCRIPTION="AWS Infrastructure Monitoring Platform"
```

### **3. Start Development Server**

```bash
# Start with hot reload
npm run dev

# Application will start on http://localhost:3000
# Clerk authentication will be available immediately
```

---

## 📁 **Project Structure**

```
frontend/
├── public/                 # Static assets
│   ├── favicon.ico        # App favicon
│   ├── placeholder.svg    # Placeholder image
│   └── robots.txt         # SEO robots file
├── src/
│   ├── components/        # Reusable React components
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── Layout.tsx    # Main application layout
│   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   ├── Topbar.tsx    # Top navigation bar
│   │   ├── AccountCard.tsx     # AWS account display card
│   │   ├── ResourceTable.tsx   # Resource inventory table
│   │   ├── ProtectedRoute.tsx  # Authentication wrapper
│   │   └── AuthLoading.tsx     # Loading component
│   ├── pages/            # Page components (routes)
│   │   ├── LandingPage.tsx     # Public landing page
│   │   ├── Dashboard.tsx       # Main dashboard overview
│   │   ├── Connect.tsx         # AWS account connection
│   │   ├── Resources.tsx       # Resource inventory page
│   │   ├── Drift.tsx          # CloudFormation drift detection
│   │   ├── Costs.tsx          # AWS cost monitoring
│   │   ├── Settings.tsx       # User settings and account management
│   │   └── NotFound.tsx       # 404 error page
│   ├── lib/              # Utility libraries
│   │   ├── api.ts        # API service layer
│   │   └── utils.ts      # Utility functions
│   ├── hooks/            # Custom React hooks
│   │   ├── use-mobile.tsx      # Mobile detection hook
│   │   └── use-toast.ts        # Toast notification hook
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   ├── index.css         # Global styles and Tailwind imports
│   └── vite-env.d.ts     # Vite TypeScript definitions
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
├── components.json       # shadcn/ui configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── README.md            # This file
```

---

## 📄 **Pages & Components**

### **Core Pages**

#### **🏠 LandingPage.tsx**
- **Purpose**: Public marketing page with authentication
- **Features**: Hero section, feature highlights, sign-in/sign-up buttons
- **Authentication**: Public (redirects authenticated users to dashboard)
- **Design**: Gradient background, modern layout, responsive

#### **📊 Dashboard.tsx**
- **Purpose**: Main overview page with aggregated data
- **Features**: Account stats, resource counts, drift status, cost overview, recent activity
- **Data Sources**: AWS accounts, resources, drift detection, cost analytics
- **Updates**: Real-time data fetching with auto-refresh

#### **🔗 Connect.tsx**
- **Purpose**: AWS account connection interface
- **Features**: IAM role setup instructions, account form, validation
- **Validation**: AWS Account ID, Role ARN, External ID validation
- **Security**: Secure credential handling, no storage of AWS keys

#### **📦 Resources.tsx**
- **Purpose**: AWS resource inventory and monitoring
- **Features**: Resource counts, detailed tables, filtering, pagination
- **Resources**: EC2 instances, S3 buckets, Lambda functions, RDS databases
- **Display**: Cards for counts, table for details, real-time updates

#### **🚨 Drift.tsx**
- **Purpose**: CloudFormation drift detection and monitoring
- **Features**: Stack listing, drift status, trigger detection, results
- **Workflow**: List stacks → Select stack → Trigger detection → View results
- **Status**: Real-time status updates, background job monitoring

#### **💰 Costs.tsx**
- **Purpose**: AWS cost monitoring and analytics
- **Features**: Cost breakdown, trends, service analysis, time filtering
- **Visualization**: Charts for trends, tables for breakdowns
- **Filtering**: Time range, granularity (daily/monthly), service filtering

#### **⚙️ Settings.tsx**
- **Purpose**: User settings and AWS account management
- **Features**: Connected accounts list, account removal, user preferences
- **Management**: Add/remove AWS accounts, update account names
- **Security**: Secure account disconnection, confirmation dialogs

#### **❌ NotFound.tsx**
- **Purpose**: 404 error handling with authentication context
- **Features**: Different UI for authenticated vs unauthenticated users
- **Navigation**: Back button, dashboard link, home page redirect
- **Design**: Consistent with app theme, helpful messaging

### **Core Components**

#### **🔐 ProtectedRoute.tsx**
- **Purpose**: Authentication wrapper for protected pages
- **Features**: Route protection, loading states, automatic redirects
- **Security**: JWT validation, user session management
- **UX**: Seamless authentication flow, loading indicators

#### **⚡ AuthLoading.tsx**
- **Purpose**: Professional loading component for auth states
- **Features**: CloudGuard branding, animated loading, consistent design
- **Usage**: Authentication initialization, route transitions
- **Design**: Gradient background, animated elements, branded

#### **📱 Layout.tsx**
- **Purpose**: Main application layout wrapper
- **Features**: Sidebar navigation, topbar, responsive design
- **Components**: Integrates Sidebar and Topbar components
- **Responsive**: Collapsible sidebar, mobile-optimized

#### **🧭 Sidebar.tsx**
- **Purpose**: Primary navigation sidebar
- **Features**: Page navigation, active state, mobile collapse
- **Links**: Dashboard, Resources, Drift, Costs, Connect, Settings
- **Design**: Icons with labels, active highlighting, smooth transitions

#### **🔝 Topbar.tsx**
- **Purpose**: Top navigation bar with user controls
- **Features**: User menu, theme toggle, notifications
- **Authentication**: User profile, sign out functionality
- **Theme**: Dark/light mode toggle with system preference

#### **🏢 AccountCard.tsx**
- **Purpose**: AWS account display component
- **Features**: Account info, status indicators, action buttons
- **Data**: Account name, ID, region, last scan time, resource counts
- **Status**: Visual indicators for healthy, warning, error states

#### **📋 ResourceTable.tsx**
- **Purpose**: Reusable table for AWS resource data
- **Features**: Sorting, filtering, pagination, responsive design
- **Types**: Supports EC2, S3, Lambda, RDS resource types
- **Actions**: View details, navigate to AWS console

---

## 🎨 **Design System**

### **Color Palette**
```css
/* Primary Colors */
--primary: 213 100% 67%;        /* Blue for actions */
--primary-foreground: 0 0% 98%; /* White text on primary */

/* AWS Brand Integration */
--gradient-aws: linear-gradient(135deg, #ff9900 0%, #ff6600 100%);

/* Status Colors */
--success: 142 76% 36%;         /* Green for success states */
--warning: 38 92% 50%;          /* Orange for warnings */
--destructive: 0 62% 30%;       /* Red for errors */

/* Neutral Colors */
--background: 0 0% 100%;        /* White background */
--foreground: 222 84% 5%;       /* Dark text */
--muted: 210 40% 98%;          /* Light gray backgrounds */
--border: 214 32% 91%;         /* Border colors */
```

### **Typography**
- **Font Family**: Inter (system font fallback)
- **Headings**: Bold weights (600-700) with proper hierarchy
- **Body Text**: Regular weight (400) with 1.5 line height
- **Code**: Monospace font for technical content

### **Spacing & Layout**
- **Grid System**: CSS Grid and Flexbox for layouts
- **Spacing Scale**: Tailwind's spacing scale (0.25rem increments)
- **Breakpoints**: Mobile-first responsive design
- **Containers**: Max-width containers with proper padding

### **Component Patterns**
- **Cards**: Consistent shadow, border-radius, padding
- **Buttons**: Primary, secondary, outline, and ghost variants
- **Forms**: Consistent validation, error states, accessibility
- **Tables**: Responsive design, sorting, pagination

---

## 🔧 **API Integration**

### **API Service Layer (`src/lib/api.ts`)**

The frontend uses a centralized API service layer for all backend communication:

```typescript
interface ApiService {
  // Authentication
  getAwsAccounts(): Promise<AwsAccountResponse[]>;
  connectAwsAccount(data: ConnectAwsRequest): Promise<ApiResponse>;
  removeAwsAccount(id: string): Promise<ApiResponse>;
  
  // Resources
  getAwsResources(): Promise<AwsResourceCounts>;
  getAwsResourceDetails(filters?: ResourceFilters): Promise<ResourceDetailsResponse>;
  
  // Drift Detection
  getDriftStacks(): Promise<DriftStacksResponse>;
  triggerDriftDetection(data: TriggerDriftRequest): Promise<TriggerDriftResponse>;
  
  // Cost Monitoring
  getCostSummary(request: CostSummaryRequest): Promise<CostSummaryResponse>;
  getCostTrends(request: CostTrendsRequest): Promise<CostTrendsResponse>;
}
```

### **Data Fetching with TanStack Query**

All API calls use TanStack Query for optimal caching and synchronization:

```typescript
// Example: Fetching AWS accounts
const { data: accounts, isLoading, error } = useQuery({
  queryKey: ['aws-accounts'],
  queryFn: getAwsAccounts,
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true
});
```

### **Error Handling**

Consistent error handling across all API operations:

```typescript
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public reqId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### **Authentication Integration**

Clerk JWT tokens are automatically included in all API requests:

```typescript
const apiService = {
  async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
};
```

---

## 🔐 **Authentication Flow**

### **Clerk Integration**

CloudGuard uses Clerk for complete authentication management:

#### **1. Application Setup**
```typescript
// main.tsx
import { ClerkProvider } from '@clerk/clerk-react';

<ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>
```

#### **2. Route Protection**
```typescript
// ProtectedRoute.tsx
const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return <AuthLoading />;
  if (!isSignedIn) return <Navigate to="/" />;
  
  return <Layout>{children}</Layout>;
};
```

#### **3. Authentication States**
- **Loading**: Show AuthLoading component while Clerk initializes
- **Unauthenticated**: Redirect to landing page with sign-in options
- **Authenticated**: Access to all protected routes and features

### **User Session Management**

- **JWT Tokens**: Automatically managed by Clerk SDK
- **Token Refresh**: Automatic token refresh for expired sessions
- **Session Persistence**: Secure session storage across browser sessions
- **Multi-tab Sync**: Session state synchronized across browser tabs

---

## 📱 **Responsive Design**

### **Mobile-First Approach**

CloudGuard is designed mobile-first with progressive enhancement:

#### **Breakpoints**
```css
/* Tailwind CSS Breakpoints */
sm: 640px   /* Small devices (landscape phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (laptops) */
xl: 1280px  /* Extra large devices (desktops) */
2xl: 1536px /* 2X large devices (large desktops) */
```

#### **Responsive Components**
- **Sidebar**: Collapsible drawer on mobile, fixed sidebar on desktop
- **Tables**: Horizontal scroll on mobile, responsive column hiding
- **Cards**: Stack vertically on mobile, grid layout on desktop
- **Forms**: Single column on mobile, multi-column on desktop

#### **Touch Interactions**
- **Touch Targets**: Minimum 44px for accessibility
- **Swipe Gestures**: Mobile-friendly navigation patterns
- **Hover States**: Appropriate for touch vs mouse interactions

### **Performance Optimizations**

#### **Code Splitting**
```typescript
// Lazy loading for pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Resources = lazy(() => import('./pages/Resources'));

// Route-based code splitting
<Suspense fallback={<AuthLoading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

#### **Image Optimization**
- **Lazy Loading**: Images load only when visible
- **Responsive Images**: Different sizes for different screens
- **WebP Support**: Modern image formats with fallbacks

#### **Bundle Optimization**
- **Tree Shaking**: Removes unused code from final bundle
- **Chunk Splitting**: Optimal code splitting for caching
- **Asset Optimization**: Minification and compression

---

## 🧪 **Development Workflow**

### **Local Development**

#### **1. Environment Setup**
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Update environment variables
# VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL, etc.
```

#### **2. Start Development Server**
```bash
# Start with hot reload
npm run dev

# Development server starts on http://localhost:3000
# Hot reload enabled for instant feedback
```

#### **3. Backend Integration**
```bash
# Ensure backend is running
cd ../backend && npm run dev

# Backend should be available at http://localhost:3001
# Health check: http://localhost:3001/health
```

### **Testing the Application**

#### **1. Authentication Flow**
```bash
# Test signup/signin flow
1. Visit http://localhost:3000
2. Click "Get Started" or "Sign In"
3. Complete Clerk authentication
4. Verify redirect to /dashboard
```

#### **2. AWS Integration**
```bash
# Test AWS account connection
1. Navigate to /connect
2. Fill in AWS account details
3. Test connection validation
4. Verify account appears in /settings
```

#### **3. Feature Testing**
```bash
# Test each major feature
1. Dashboard - Overall statistics and activity
2. Resources - Resource inventory and details
3. Drift - CloudFormation drift detection
4. Costs - Cost monitoring and trends
5. Settings - Account management
```

### **Building for Production**

#### **1. Development Build**
```bash
# Build for development (includes source maps)
npm run build:dev
```

#### **2. Production Build**
```bash
# Optimized production build
npm run build

# Preview production build locally
npm run preview
```

#### **3. Build Outputs**
```
dist/
├── assets/          # Optimized JS/CSS bundles
├── images/          # Optimized images
├── index.html       # Main HTML file
└── ...             # Other static assets
```

### **Code Quality & Standards**

#### **ESLint Configuration**
```typescript
// eslint.config.js
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  }
];
```

#### **TypeScript Standards**
- **Strict Mode**: Enabled for better type safety
- **Explicit Types**: Interface definitions for all API responses
- **Component Props**: Typed interfaces for all component props
- **Utility Types**: Proper use of TypeScript utility types

#### **Component Standards**
```typescript
// Component naming: PascalCase
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Custom hooks at the top
  const { data, isLoading } = useQuery();
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Handler implementation
  }, [dependencies]);
  
  // Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  // Main render
  return <div>{/* Component JSX */}</div>;
};
```

---

## 📋 **Scripts & Commands**

### **Development Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm run dev` | Start development server with hot reload |
| **Build** | `npm run build` | Production build with optimizations |
| **Build Dev** | `npm run build:dev` | Development build with source maps |
| **Preview** | `npm run preview` | Preview production build locally |
| **Lint** | `npm run lint` | Run ESLint code analysis |

### **Quality Assurance Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Type Check** | `npx tsc --noEmit` | Run TypeScript type checking |
| **Format** | `npx prettier --write .` | Format code with Prettier |
| **Bundle Analysis** | `npx vite-bundle-analyzer` | Analyze bundle size |

### **Deployment Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Build Production** | `npm run build` | Optimized production build |
| **Serve Static** | `npx serve dist` | Serve built files locally |
| **Deploy Preview** | `npm run preview` | Preview deployment build |

---

## 🐛 **Troubleshooting**

### **Common Development Issues**

#### **1. Clerk Authentication Not Working**
```
Error: Clerk publishable key is missing
```
**Solutions:**
- Verify `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`
- Ensure Clerk application is properly configured
- Check domain configuration in Clerk dashboard

#### **2. API Connection Failed**
```
Error: Network Error or CORS issues
```
**Solutions:**
- Verify backend is running on `http://localhost:3001`
- Check `VITE_API_URL` in environment variables
- Ensure CORS is configured on backend for `http://localhost:3000`

#### **3. Build Failures**
```
Error: TypeScript compilation errors
```
**Solutions:**
- Run `npx tsc --noEmit` to check type errors
- Verify all imports are correct
- Check for missing type definitions

#### **4. Routing Issues**
```
Error: Cannot resolve route or 404 on refresh
```
**Solutions:**
- Configure development server for SPA routing
- Ensure all routes are properly defined in App.tsx
- Check ProtectedRoute implementation

#### **5. Theme Not Loading**
```
Error: Styles not applying or dark mode issues
```
**Solutions:**
- Verify Tailwind CSS is properly configured
- Check `next-themes` provider setup
- Ensure CSS imports are correct in main.tsx

### **Performance Issues**

#### **1. Slow Initial Load**
**Solutions:**
- Implement code splitting for large pages
- Optimize images and assets
- Review bundle size with `vite-bundle-analyzer`

#### **2. API Request Delays**
**Solutions:**
- Check TanStack Query configuration
- Implement proper loading states
- Optimize API response caching

#### **3. Memory Leaks**
**Solutions:**
- Review useEffect cleanup functions
- Check for unsubscribed event listeners
- Monitor component re-renders

### **Debug Mode**

Enable debug logging:
```typescript
// Enable React Query debug mode
<QueryClient client={queryClient}>
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
</QueryClient>
```

### **Browser Developer Tools**

Essential debugging techniques:
1. **React DevTools**: Inspect component tree and props
2. **Network Tab**: Monitor API requests and responses
3. **Console**: Check for JavaScript errors and warnings
4. **Application Tab**: Inspect localStorage and sessionStorage
5. **Sources Tab**: Debug TypeScript with source maps

---

## 🚀 **Production Deployment**

### **Build Optimization**

#### **Production Build Configuration**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts']
        }
      }
    }
  }
});
```

#### **Environment Variables for Production**
```bash
# Production environment (.env.production)
VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."
VITE_API_URL="https://api.cloudguard.com"
VITE_APP_ENV="production"
```

### **Static Site Hosting**

#### **Vercel Deployment**
```json
// vercel.json
{
  "builds": [
    {
      "src": "dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### **Netlify Deployment**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### **AWS S3 + CloudFront**
```bash
# Build and deploy to S3
npm run build
aws s3 sync dist/ s3://cloudguard-frontend --delete
aws cloudfront create-invalidation --distribution-id EXXXXXXXXXXXXX --paths "/*"
```

### **Performance Monitoring**

#### **Web Vitals**
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

#### **Monitoring Tools**
- **Google Analytics**: User behavior and performance
- **Sentry**: Error tracking and performance monitoring
- **Lighthouse**: Automated performance audits

### **Security Considerations**

#### **Content Security Policy**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://clerk.cloudguard.com; 
               style-src 'self' 'unsafe-inline';">
```

#### **Environment Security**
- **API Keys**: Never expose sensitive keys in frontend code
- **HTTPS**: Always use HTTPS in production
- **Domain Validation**: Configure proper domains in Clerk

---

## 📚 **Component Library**

### **shadcn/ui Components**

CloudGuard uses a comprehensive set of shadcn/ui components:

#### **Layout Components**
- **Card**: Content containers with consistent styling
- **Sheet**: Slide-out panels for mobile navigation
- **Separator**: Visual dividers between content sections
- **Scroll Area**: Custom scrollbars for overflow content

#### **Form Components**
- **Input**: Text inputs with validation states
- **Select**: Dropdown selection with search
- **Button**: Multiple variants (primary, secondary, outline, ghost)
- **Checkbox**: Binary selection controls
- **Switch**: Toggle controls for settings

#### **Data Display**
- **Table**: Responsive data tables with sorting
- **Badge**: Status indicators and labels
- **Avatar**: User profile pictures and placeholders
- **Progress**: Progress bars for loading states

#### **Feedback Components**
- **Alert**: Important messages and notifications
- **Toast**: Temporary notification messages
- **Dialog**: Modal dialogs for confirmations
- **Tooltip**: Contextual help and information

#### **Navigation Components**
- **Breadcrumb**: Navigation path indicators
- **Tabs**: Content organization and navigation
- **Accordion**: Collapsible content sections
- **Command**: Command palette for quick actions

### **Custom Components**

#### **Layout Components**
```typescript
// Layout.tsx - Main application layout
interface LayoutProps {
  children: React.ReactNode;
}

// Sidebar.tsx - Navigation sidebar
interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// Topbar.tsx - Top navigation
interface TopbarProps {
  user?: User;
  onThemeToggle?: () => void;
}
```

#### **Feature Components**
```typescript
// AccountCard.tsx - AWS account display
interface AccountCardProps {
  account: AwsAccount;
  onRemove?: (id: string) => void;
  onRefresh?: (id: string) => void;
}

// ResourceTable.tsx - Resource inventory
interface ResourceTableProps {
  resources: AwsResource[];
  type?: 'ec2' | 's3' | 'lambda' | 'rds';
  pagination?: PaginationConfig;
  onFilter?: (filters: ResourceFilters) => void;
}
```

---

## 🔄 **State Management**

### **TanStack Query for Server State**

All server data is managed through TanStack Query:

```typescript
// Query Keys
export const queryKeys = {
  awsAccounts: ['aws-accounts'] as const,
  awsResources: ['aws-resources'] as const,
  driftStacks: ['drift-stacks'] as const,
  costSummary: (params: CostParams) => ['cost-summary', params] as const,
  costTrends: (params: TrendParams) => ['cost-trends', params] as const,
};

// Custom Hooks
export const useAwsAccounts = () => {
  return useQuery({
    queryKey: queryKeys.awsAccounts,
    queryFn: getAwsAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### **Local State Management**

#### **React Hooks**
- **useState**: Component-level state
- **useReducer**: Complex state logic
- **useContext**: Shared state across components
- **useCallback**: Memoized callbacks
- **useMemo**: Memoized calculations

#### **Custom Hooks**
```typescript
// useApiService - API service hook
export const useApiService = () => {
  const { getToken } = useAuth();
  
  return useMemo(() => ({
    getAwsAccounts: () => apiService.getAwsAccounts(getToken),
    connectAwsAccount: (data) => apiService.connectAwsAccount(data, getToken),
    // ... other methods
  }), [getToken]);
};

// useMobile - Mobile detection hook
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return isMobile;
};
```

---

## 🤝 **Contributing**

### **Development Standards**

#### **Code Style Guidelines**
- **TypeScript**: Use explicit types, avoid `any`
- **React**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **File Structure**: One component per file, co-located tests
- **Imports**: Absolute imports using `@/` alias

#### **Component Development**
```typescript
// Component template
interface ComponentProps {
  // Explicit prop types
  data: DataType;
  onAction?: (id: string) => void;
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({
  data,
  onAction,
  className
}) => {
  // Hooks at the top
  const [state, setState] = useState<StateType>(initialState);
  const { isLoading } = useQuery(/* ... */);
  
  // Event handlers
  const handleClick = useCallback((id: string) => {
    onAction?.(id);
  }, [onAction]);
  
  // Early returns
  if (isLoading) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className={cn("base-classes", className)}>
      {/* Component content */}
    </div>
  );
};
```

#### **Testing Guidelines**
- **Unit Tests**: Test component logic and rendering
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Accessibility**: Test with screen readers and keyboard navigation

### **Git Workflow**

#### **Branch Naming**
```bash
feature/component-name    # New features
bugfix/issue-description  # Bug fixes
hotfix/critical-issue     # Critical production fixes
refactor/module-name      # Code refactoring
```

#### **Commit Messages**
```bash
feat(components): add ResourceTable pagination
fix(auth): resolve token refresh issue
docs(readme): update setup instructions
style(ui): improve mobile responsiveness
test(api): add integration tests for drift detection
```

### **Code Review Checklist**
- [ ] TypeScript types are explicit and correct
- [ ] Components follow established patterns
- [ ] Responsive design works on all screen sizes
- [ ] Accessibility standards are met
- [ ] Error handling is implemented
- [ ] Loading states are provided
- [ ] Tests are included and passing

---

## 📞 **Support & Resources**

### **Documentation Resources**
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Vite Guide**: https://vitejs.dev/guide/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **Clerk Documentation**: https://clerk.com/docs

### **Development Tools**
- **VS Code Extensions**: ES7 React/Redux/GraphQL/React-Native snippets, Tailwind CSS IntelliSense
- **Browser Extensions**: React Developer Tools, TanStack Query DevTools
- **Design Tools**: Figma for design mockups, Chrome DevTools for debugging

### **Getting Help**

#### **Common Support Scenarios**

1. **Component Not Rendering**
   - Check TypeScript errors in terminal
   - Verify all imports are correct
   - Test component in isolation

2. **Styling Issues**
   - Verify Tailwind classes are correct
   - Check responsive breakpoints
   - Use browser DevTools to debug CSS

3. **API Integration Problems**
   - Check network tab for failed requests
   - Verify TanStack Query configuration
   - Test API endpoints independently

4. **Authentication Issues**
   - Verify Clerk configuration
   - Check environment variables
   - Test authentication flow step by step

#### **Debug Information to Collect**
- Browser version and operating system
- Console error messages with stack traces
- Network request/response details
- Component state and props
- Environment variable configuration

---

## 🔄 **Changelog & Roadmap**

### **Current Version: 1.0.0**

#### **Implemented Features**
- ✅ Complete authentication system with Clerk
- ✅ Protected routing with role-based access
- ✅ Responsive design for all screen sizes
- ✅ Real-time AWS resource monitoring
- ✅ CloudFormation drift detection interface
- ✅ AWS cost monitoring with data visualization
- ✅ Multi-account AWS connection management
- ✅ Professional dashboard with aggregated insights
- ✅ Modern UI with dark/light theme support

#### **Component Library**
- ✅ 35+ shadcn/ui components integrated
- ✅ Custom CloudGuard-specific components
- ✅ Consistent design system and theming
- ✅ Mobile-optimized responsive components

#### **Developer Experience**
- ✅ TypeScript for type safety
- ✅ Hot reload development server
- ✅ ESLint and code quality tools
- ✅ Comprehensive documentation

### **Planned Features (Version 1.1)**

#### **Enhanced User Experience**
- 🔄 Real-time WebSocket notifications
- 🔄 Advanced filtering and search
- 🔄 Customizable dashboard layouts
- 🔄 Export functionality for reports

#### **Additional Monitoring**
- 🔄 AWS Config compliance monitoring
- 🔄 Security group analysis
- 🔄 Cost optimization recommendations
- 🔄 Resource tagging and organization

#### **Advanced Features**
- 🔄 Multi-region support
- 🔄 Team collaboration features
- 🔄 Advanced alerting and notifications
- 🔄 Integration with third-party tools

### **Future Roadmap (Version 2.0)**

#### **Platform Expansion**
- 🔄 Multi-cloud support (Azure, GCP)
- 🔄 Advanced analytics and reporting
- 🔄 Machine learning insights
- 🔄 API for third-party integrations

---

**CloudGuard Frontend - Modern React SaaS for AWS Monitoring** 🚀

**Built with React 18, TypeScript, Vite, and shadcn/ui for enterprise-grade AWS infrastructure monitoring.**

For additional support or questions, please refer to the troubleshooting section or contact the development team.
