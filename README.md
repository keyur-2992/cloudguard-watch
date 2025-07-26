# CloudGuard

**🛡️ Enterprise AWS Infrastructure Monitoring & Cost Analytics Platform**

CloudGuard is a modern SaaS application that provides comprehensive AWS infrastructure monitoring, CloudFormation drift detection, and cost analytics across multiple AWS accounts. Built with React, TypeScript, Fastify, and PostgreSQL for enterprise-grade performance and security.

## 🌟 **Key Features**

- **🔐 Multi-Account AWS Connection** - Secure cross-account IAM role integration
- **📊 Real-time Resource Monitoring** - EC2, S3, Lambda, RDS inventory tracking
- **🚨 Drift Detection** - CloudFormation stack drift monitoring with background jobs
- **💰 Cost Analytics** - AWS Cost Explorer integration with trend analysis
- **🎯 Unified Dashboard** - Aggregated insights across all connected accounts
- **🔒 Enterprise Security** - Clerk authentication with JWT, rate limiting, CORS protection
- **📱 Responsive Design** - Modern UI that works on desktop, tablet, and mobile
- **⚡ Real-time Updates** - Background processing for async operations

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │      AWS        │
│   React 18      │◄──►│   Fastify API    │◄──►│   Multi-Account │
│   TypeScript    │    │   PostgreSQL     │    │   Cross-Account │
│   shadcn/ui     │    │   Prisma ORM     │    │   IAM Roles     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Authentication │    │  Background Jobs │    │   AWS Services  │
│  Clerk + JWT    │    │  Drift Detection │    │  EC2, S3, RDS   │
│  Route Guard    │    │  Cost Polling    │    │  CloudFormation │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL 13+
- AWS Account with service credentials for CloudGuard backend
- User AWS accounts with IAM roles for monitoring
- Clerk account for authentication

### **1. Clone & Install**
```bash
git clone <repository-url>
cd cloudguard-watch

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### **2. Environment Setup**

**Backend** (create `backend/.env`):
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/cloudguard_watch"
CLERK_DOMAIN="your-clerk-domain.clerk.accounts.dev"
CLERK_AUDIENCE="clerk"
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000"
```

**Frontend** (create `frontend/.env.local`):
```bash
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_URL="http://localhost:3001"
```

### **3. Database Setup**
```bash
cd backend
npm run db:generate
npm run db:push
```

### **4. Start Development**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

**Access the app**: http://localhost:3000

## 📁 **Project Structure**

```
cloudguard-watch/
├── frontend/                 # React Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui base components
│   │   │   ├── Layout.tsx   # App layout wrapper
│   │   │   ├── Sidebar.tsx  # Navigation sidebar
│   │   │   └── ...          # Other components
│   │   ├── pages/           # Route-based page components
│   │   │   ├── Dashboard.tsx     # Main overview page
│   │   │   ├── Connect.tsx       # AWS account connection
│   │   │   ├── Resources.tsx     # Resource inventory
│   │   │   ├── Drift.tsx         # Drift detection
│   │   │   ├── Costs.tsx         # Cost monitoring
│   │   │   └── Settings.tsx      # User settings
│   │   ├── lib/             # Utility libraries
│   │   │   ├── api.ts       # API service layer
│   │   │   └── utils.ts     # Helper functions
│   │   └── hooks/           # Custom React hooks
│   ├── package.json         # Frontend dependencies
│   └── README.md           # Frontend documentation
├── backend/                  # Fastify Backend API
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   │   ├── connectAws.ts        # AWS connection
│   │   │   ├── awsAccounts.ts       # Account management
│   │   │   ├── awsResources.ts      # Resource inventory
│   │   │   ├── driftDetection.ts    # Drift monitoring
│   │   │   └── costMonitoring.ts    # Cost analytics
│   │   ├── lib/             # Utility libraries
│   │   │   ├── auth.ts             # Clerk authentication
│   │   │   ├── prisma.ts           # Database client
│   │   │   └── awsHelpers.ts       # AWS SDK helpers
│   │   ├── types/           # TypeScript interfaces
│   │   └── server.ts        # Main server setup
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json         # Backend dependencies
│   └── README.md           # Backend documentation
└── README.md               # This file - Project overview
```

## 🛠️ **Tech Stack**

### **Frontend**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development, optimized builds)
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Authentication**: Clerk React SDK
- **Data Fetching**: TanStack Query (React Query v5)
- **Routing**: React Router DOM v6
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS with custom design system

### **Backend**
- **Framework**: Fastify (high-performance Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk JWT with JWKS validation
- **AWS Integration**: AWS SDK v3 (STS, EC2, S3, Lambda, RDS, CloudFormation, Cost Explorer)
- **Validation**: Zod schema validation
- **Background Jobs**: In-memory polling for drift detection
- **Security**: Helmet.js, CORS, rate limiting

### **DevOps & Infrastructure**
- **Database**: PostgreSQL 13+
- **Development**: Hot reload, TypeScript strict mode
- **Build**: Optimized production builds
- **Deployment**: Docker, Vercel, Netlify ready

## 🎯 **Core Features Deep Dive**

### **🔗 AWS Account Connection**
- Secure cross-account IAM role assumption
- External ID for enhanced security
- Real-time connection validation
- Support for multiple AWS accounts per user

### **📊 Resource Inventory**
- **EC2**: Instances with state, type, launch time
- **S3**: Buckets with region, creation date, encryption
- **Lambda**: Functions with runtime, memory, last modified
- **RDS**: Databases with engine, status, storage

### **🚨 Drift Detection**
- CloudFormation stack monitoring
- Background drift detection jobs
- Resource-level drift analysis
- Real-time status updates

### **💰 Cost Analytics**
- Daily/monthly cost breakdowns
- Service-level cost analysis
- Period-over-period comparisons
- Cost trend visualization

### **🎛️ Dashboard Overview**
- Connected account statistics
- Total resource counts across accounts
- Drift detection status summary
- Monthly cost overview with trends

## 🔐 **Security Features**

- **🔒 Authentication**: Clerk JWT with automatic token refresh
- **🛡️ Authorization**: Route-level protection with role validation
- **🔑 AWS Security**: Cross-account IAM roles with external IDs
- **🚫 Rate Limiting**: API protection (10 requests/minute per user)
- **🛠️ Input Validation**: Zod schema validation for all inputs
- **📝 Audit Logging**: Comprehensive request/response logging
- **🌐 CORS Protection**: Configured allowed origins
- **🔒 Security Headers**: Helmet.js for various protections

## 📈 **Performance Features**

- **⚡ Fast Loading**: Vite for instant dev server and optimized builds
- **📦 Code Splitting**: Route-based lazy loading
- **🔄 Smart Caching**: TanStack Query for optimal data fetching
- **📱 Responsive**: Mobile-first design with progressive enhancement
- **🎨 Optimized UI**: Virtualized tables for large datasets
- **⏱️ Background Jobs**: Async processing for long-running operations

## 🧪 **Development Workflow**

### **Available Scripts**

**Backend**:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open database GUI
```

**Frontend**:
```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
npm run lint    # Run ESLint
```

### **Development Standards**
- **TypeScript**: Strict mode with explicit types
- **Code Quality**: ESLint + Prettier for consistent formatting
- **Git Workflow**: Feature branches with descriptive commits
- **Testing**: Component and integration testing
- **Documentation**: Comprehensive README files for each module

## 🚀 **Deployment**

### **Production Build**
```bash
# Backend
cd backend && npm run build

# Frontend  
cd frontend && npm run build
```

### **Environment Configuration**
- **Backend**: Production DATABASE_URL, Clerk configuration
- **Frontend**: Production API URL, Clerk publishable key
- **Security**: HTTPS, secure headers, rate limiting
- **Monitoring**: Error tracking, performance monitoring

### **Hosting Options**
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Backend**: Railway, Render, AWS ECS, Docker containers
- **Database**: AWS RDS, Supabase, Railway PostgreSQL

## 🔐 **AWS Authentication Architecture**

CloudGuard uses a secure **assume role** architecture where:

1. **CloudGuard Service** has its own AWS credentials for the backend
2. **User AWS Accounts** create IAM roles that trust the CloudGuard service
3. **CloudGuard** assumes these user roles to access user resources
4. **Users** retain full control and can revoke access anytime

### **Security Benefits:**
- ✅ Users control their own data and costs
- ✅ CloudGuard cannot access user data without explicit permission
- ✅ Users can audit all CloudGuard access in their CloudTrail logs
- ✅ External ID provides additional security layer
- ✅ Role sessions are temporary (1 hour) and automatically expire

## 📊 **AWS Setup Instructions**

### **For CloudGuard Backend Service:**

Create a `.env` file in the `backend/` directory:

```env
# AWS Service Credentials (for CloudGuard backend)
AWS_ACCESS_KEY_ID=your-cloudguard-service-access-key
AWS_SECRET_ACCESS_KEY=your-cloudguard-service-secret-key
AWS_DEFAULT_REGION=us-east-1

# Other configuration...
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="..."
```

### **For User AWS Accounts:**

Each user needs to create an IAM role in their AWS account:

#### **1. Create IAM Role**
```bash
aws iam create-role \
  --role-name CloudGuardMonitoringRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::YOUR-CLOUDGUARD-ACCOUNT:root"
        },
        "Action": "sts:AssumeRole",
        "Condition": {
          "StringEquals": {
            "sts:ExternalId": "your-unique-external-id"
          }
        }
      }
    ]
  }'
```

#### **2. Attach Required Permissions**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:List*", "s3:Get*",
        "rds:Describe*",
        "lambda:List*", "lambda:Get*",
        "cloudformation:DescribeStacks",
        "cloudformation:ListStacks",
        "cloudformation:DetectStackDrift",
        "cloudformation:DescribeStackDriftDetectionStatus",
        "ce:GetCostAndUsage",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

#### **3. Connect in CloudGuard UI**
- Role ARN: `arn:aws:iam::123456789012:role/CloudGuardMonitoringRole`
- External ID: `your-unique-external-id`
- Account Name: `Production` (optional)

## 🎯 **Getting Started Checklist**

### **Development Setup**
- [ ] **Prerequisites**: Node.js 18+, PostgreSQL, AWS account
- [ ] **Clone repository** and install dependencies
- [ ] **Configure Clerk** authentication with JWT templates
- [ ] **Set up database** with Prisma migrations
- [ ] **Create backend `.env` file** with AWS service credentials
- [ ] **Set up environment variables** for both frontend and backend
- [ ] **Start development servers** and verify connectivity

### **AWS Configuration**
- [ ] **CloudGuard Service**: Add AWS credentials to `backend/.env`
- [ ] **User AWS Account**: Create IAM role with trust policy
- [ ] **User AWS Account**: Attach monitoring permissions to role
- [ ] **Test Connection**: Connect user AWS account via CloudGuard UI
- [ ] **Verify Access**: Check resource monitoring and drift detection

### **Production Deployment**
- [ ] **Create dedicated AWS account** for CloudGuard service
- [ ] **Configure production environment variables**
- [ ] **Set up monitoring and logging**
- [ ] **Enable HTTPS and security headers**
- [ ] **Test assume role functionality** with production credentials

## 📚 **Documentation**

- **[Frontend Documentation](./frontend/README.md)** - React app architecture, components, development
- **[Backend Documentation](./backend/README.md)** - API endpoints, authentication, database schema
- **[AWS Setup Guide](./backend/README.md#aws-security)** - IAM role configuration and permissions

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript and code quality standards
4. Test your changes thoroughly
5. Commit with descriptive messages (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

- **Documentation**: Check frontend and backend README files
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

---

**CloudGuard - Built for Enterprise AWS Infrastructure Monitoring** 🚀

**Monitor your AWS infrastructure with confidence, detect drift in real-time, and optimize costs across multiple accounts.** 