# CloudGuard Backend API

**Enterprise-grade AWS Infrastructure Monitoring SaaS Platform**

Secure, scalable backend API built with Fastify, Prisma ORM, AWS SDK v3, and Clerk authentication for comprehensive AWS cloud infrastructure monitoring, drift detection, and cost analytics.

## 🏗️ **Architecture Overview**

CloudGuard is a comprehensive AWS monitoring platform that provides:

- **🔐 Multi-Account AWS Connection** - Secure cross-account IAM role assumption
- **📊 Resource Inventory** - Real-time EC2, S3, Lambda, RDS resource monitoring  
- **🚨 Drift Detection** - CloudFormation stack drift monitoring with background jobs
- **💰 Cost Analytics** - AWS Cost Explorer integration with trend analysis
- **🎯 Unified Dashboard** - Aggregated insights across all connected accounts
- **⚡ Real-time Updates** - Background processing for async operations

### **Tech Stack**
- **Framework**: Fastify (high-performance Node.js framework)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk JWT with JWKS validation
- **AWS Integration**: AWS SDK v3 (STS, EC2, S3, Lambda, RDS, CloudFormation, Cost Explorer)
- **Background Jobs**: In-memory polling for drift detection
- **Security**: Helmet.js, CORS, rate limiting, input validation
- **Validation**: Zod schema validation
- **Logging**: Pino structured logging

---

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js 18+** and npm
- **PostgreSQL 13+** database
- **Clerk account** for authentication  
- **AWS Account** with appropriate IAM permissions

### **1. Installation**

```bash
# Clone and navigate to backend
cd backend

# Install dependencies
npm install
```

### **2. Environment Configuration**

Create a `.env` file in the backend directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/cloudguard_watch"

# Clerk Authentication
CLERK_DOMAIN="your-clerk-domain.clerk.accounts.dev"
CLERK_AUDIENCE="clerk"

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS="http://localhost:3000,https://your-frontend-domain.com"

# AWS Service Credentials (Required for assume role functionality)
AWS_ACCESS_KEY_ID=your-cloudguard-service-access-key
AWS_SECRET_ACCESS_KEY=your-cloudguard-service-secret-key
AWS_DEFAULT_REGION=us-east-1
```

#### **⚠️ Important: AWS Credentials Setup**

The AWS credentials above are for the **CloudGuard service backend**, not user credentials. These credentials allow CloudGuard to assume roles in user AWS accounts.

**For Development:**
- Use your personal AWS credentials temporarily
- Create a dedicated IAM user with only `sts:AssumeRole` permissions

**For Production:**
- Create a dedicated AWS account for the CloudGuard service
- Or use IAM roles on AWS infrastructure (EC2, ECS, Lambda)
- Never use personal credentials in production

**Required IAM Policy for CloudGuard Service Account:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### **3. Database Setup**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio for DB management
npm run db:studio
```

### **4. Start Development Server**

```bash
# Start with hot reload
npm run dev

# Server will start on http://localhost:3001
# Health check: http://localhost:3001/health
```

---

## 🗄️ **Database Schema**

### **Core Models**

#### **Users**
```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  awsAccounts AwsAccount[]
}
```

#### **AWS Accounts**
```prisma
model AwsAccount {
  id         String   @id @default(cuid())
  userId     String
  accountId  String   // 12-digit AWS Account ID
  roleArn    String   // IAM Role ARN for cross-account access
  externalId String   // External ID for security
  name       String?  // User-friendly name
  region     String?  // Primary region
  status     String   // connected, error, scanning
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user                AwsAccount @relation(fields: [userId], references: [id])
  cloudformationStacks CloudFormationStack[]
  costEntries         CostEntry[]
  costSummaries       CostSummary[]
  
  @@unique([userId, accountId])
}
```

#### **CloudFormation Stacks**
```prisma
model CloudFormationStack {
  id               String   @id @default(cuid())
  awsAccountDbId   String   // References AwsAccount.id
  awsAccountId     String   // AWS Account ID
  stackName        String
  stackId          String   // AWS CloudFormation Stack ID
  status           String   // CREATE_COMPLETE, UPDATE_COMPLETE, etc.
  driftStatus      String?  // IN_SYNC, DRIFTED, NOT_CHECKED, UNKNOWN
  driftDetectionId String?  // AWS drift detection operation ID
  detectionTime    DateTime?
  region           String
  description      String?
  tags             Json?    // Stack tags
  outputs          Json?    // Stack outputs
  parameters       Json?    // Stack parameters
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  awsAccount       AwsAccount @relation(fields: [awsAccountDbId], references: [id])
  driftResults     StackDriftResult[]
  
  @@unique([awsAccountId, stackName, region])
}
```

#### **Stack Drift Results**
```prisma
model StackDriftResult {
  id                    String   @id @default(cuid())
  stackId               String
  resourceLogicalId     String
  resourceType          String
  resourcePhysicalId    String?
  driftStatus           String   // IN_SYNC, MODIFIED, DELETED, NOT_CHECKED
  actualProperties      Json?    // Current resource properties
  expectedProperties    Json?    // Expected resource properties
  propertyDifferences   Json?    // Property differences
  createdAt             DateTime @default(now())
  
  stack                 CloudFormationStack @relation(fields: [stackId], references: [id])
  
  @@unique([stackId, resourceLogicalId])
}
```

#### **Drift Detection Jobs**
```prisma
model DriftDetectionJob {
  id               String   @id @default(cuid())
  awsAccountId     String
  stackName        String
  region           String
  driftDetectionId String   @unique
  status           String   // DETECTION_IN_PROGRESS, DETECTION_FAILED, DETECTION_COMPLETE
  failureReason    String?
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

#### **Cost Monitoring Models**
```prisma
model CostEntry {
  id           String   @id @default(cuid())
  awsAccountDbId String
  awsAccountId String
  date         DateTime
  service      String   // AWS Service (e.g., "Amazon EC2")
  amount       Decimal  @db.Decimal(15, 4)
  unit         String   // Currency unit (e.g., "USD")
  granularity  String   // DAILY or MONTHLY
  region       String?
  usageType    String?
  operation    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  awsAccount   AwsAccount @relation(fields: [awsAccountDbId], references: [id])
  
  @@unique([awsAccountId, date, service, granularity])
}

model CostSummary {
  id           String   @id @default(cuid())
  awsAccountDbId String
  awsAccountId String
  startDate    DateTime
  endDate      DateTime
  granularity  String
  totalAmount  Decimal  @db.Decimal(15, 4)
  unit         String
  topServices  Json     // Top 5 services array
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  awsAccount   AwsAccount @relation(fields: [awsAccountDbId], references: [id])
  
  @@unique([awsAccountId, startDate, endDate, granularity])
}
```

---

## 🌐 **API Endpoints**

### **Authentication**
All endpoints (except `/health`) require Clerk JWT authentication:
```
Authorization: Bearer <clerk-jwt-token>
```

### **Core Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Server health check | ❌ |
| POST | `/api/connect-aws` | Connect new AWS account | ✅ |
| GET | `/api/aws-accounts` | List connected AWS accounts | ✅ |
| DELETE | `/api/aws-accounts/:id` | Remove AWS account | ✅ |
| GET | `/api/aws-resources` | Get aggregated resource counts | ✅ |
| GET | `/api/aws-resources/details` | Get detailed resource inventory | ✅ |

### **Drift Detection Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/drift/stacks` | List CloudFormation stacks with drift status | ✅ |
| POST | `/api/drift/trigger` | Trigger drift detection for a stack | ✅ |

### **Cost Monitoring Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/cost/summary` | Get cost breakdown by service | ✅ |
| GET | `/api/cost/trends` | Get cost trends with comparisons | ✅ |

---

## 📡 **Detailed API Documentation**

### **POST /api/connect-aws**
Connect a new AWS account for monitoring.

**Request Body:**
```json
{
  "accountId": "123456789012",
  "roleArn": "arn:aws:iam::123456789012:role/CloudGuardMonitoringRole",
  "externalId": "unique-external-id-123",
  "name": "Production Account",
  "region": "us-east-1"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "clm1234567890",
    "accountId": "123456789012",
    "name": "Production Account",
    "roleArn": "arn:aws:iam::123456789012:role/CloudGuardMonitoringRole",
    "region": "us-east-1",
    "status": "connected",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "AWS account connected successfully"
}
```

### **GET /api/aws-resources**
Get aggregated resource counts across all connected AWS accounts.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "ec2Count": 45,
    "s3Count": 23,
    "lambdaCount": 67,
    "rdsCount": 12,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### **GET /api/aws-resources/details**
Get detailed resource inventory with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `type` (optional): Filter by resource type (`ec2`, `s3`, `lambda`, `rds`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "type": "ec2",
        "id": "i-1234567890abcdef0",
        "name": "WebServer-01",
        "accountId": "123456789012",
        "region": "us-east-1",
        "state": "running",
        "instanceType": "t3.medium",
        "launchTime": "2024-01-10T08:00:00Z",
        "tags": {
          "Environment": "production",
          "Project": "web-app"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 147,
      "totalPages": 3
    }
  }
}
```

### **GET /api/drift/stacks**
List CloudFormation stacks with their drift detection status.

**Query Parameters:**
- `accountId` (optional): Filter by AWS account ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stacks": [
      {
        "id": "clm1234567890",
        "stackName": "web-app-infrastructure",
        "stackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/web-app-infrastructure/12345678-1234-1234-1234-123456789012",
        "accountId": "123456789012",
        "region": "us-east-1",
        "status": "UPDATE_COMPLETE",
        "driftStatus": "DRIFTED",
        "detectionTime": "2024-01-15T09:15:00Z",
        "description": "Web application infrastructure",
        "tags": {
          "Environment": "production"
        }
      }
    ]
  }
}
```

### **POST /api/drift/trigger**
Trigger drift detection for a specific CloudFormation stack.

**Request Body:**
```json
{
  "accountId": "123456789012",
  "stackName": "web-app-infrastructure",
  "region": "us-east-1"
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "driftDetectionId": "12345678-1234-1234-1234-123456789012",
    "status": "DETECTION_IN_PROGRESS",
    "message": "Drift detection started. Results will be available in a few minutes."
  }
}
```

### **GET /api/cost/summary**
Get cost breakdown by AWS service with filtering options.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)
- `granularity` (optional): `DAILY` or `MONTHLY` (default: `DAILY`)
- `service` (optional): Filter by specific AWS service

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalAmount": "1247.83",
    "unit": "USD",
    "startDate": "2024-01-01",
    "endDate": "2024-01-30",
    "granularity": "DAILY",
    "breakdown": [
      {
        "service": "Amazon EC2",
        "amount": "562.45",
        "percentage": 45.2
      },
      {
        "service": "Amazon S3",
        "amount": "89.12",
        "percentage": 7.1
      }
    ],
    "dailyCosts": [
      {
        "date": "2024-01-15",
        "amount": "41.23"
      }
    ]
  }
}
```

### **GET /api/cost/trends**
Get cost trends with period-over-period comparison.

**Query Parameters:**
- `days` (optional): Number of days for current period (default: 30)
- `granularity` (optional): `DAILY` or `MONTHLY` (default: `DAILY`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "current": {
      "amount": "1247.83",
      "unit": "USD",
      "period": "2024-01-01 to 2024-01-30"
    },
    "previous": {
      "amount": "1156.92",
      "unit": "USD",
      "period": "2023-12-01 to 2023-12-30"
    },
    "trend": {
      "changeAmount": "90.91",
      "changePercent": 7.86,
      "direction": "increase"
    },
    "forecast": {
      "nextPeriodEstimate": "1312.45",
      "confidence": "medium"
    }
  }
}
```

---

## ⚙️ **Background Jobs & Processing**

### **Drift Detection Background Jobs**

CloudGuard implements background job processing for CloudFormation drift detection:

#### **How It Works:**
1. **Trigger**: User initiates drift detection via `/api/drift/trigger`
2. **AWS Call**: Backend calls `DetectStackDrift` on AWS CloudFormation
3. **Job Creation**: Drift detection job is stored with `DETECTION_IN_PROGRESS` status
4. **Background Polling**: Every 2 minutes, background job checks status via `DescribeStackDriftDetectionStatus`
5. **Completion**: When detection completes, fetch detailed drift results and update database
6. **Cleanup**: Mark job as `DETECTION_COMPLETE` and store results

#### **Background Job Architecture:**
```typescript
// Background job runs every 2 minutes
setInterval(processDriftDetectionJobs, 2 * 60 * 1000);

async function processDriftDetectionJobs() {
  // 1. Find all in-progress jobs
  const jobs = await prisma.driftDetectionJob.findMany({
    where: { status: 'DETECTION_IN_PROGRESS' }
  });

  // 2. Check status for each job
  for (const job of jobs) {
    const status = await describeStackDriftDetectionStatus(job.driftDetectionId);
    
    // 3. If complete, fetch results and update database
    if (status === 'DETECTION_COMPLETE') {
      await updateStackDriftResults(job);
    }
  }
}
```

#### **Error Handling:**
- **Timeout**: Jobs older than 1 hour are marked as failed
- **Retry Logic**: Failed AWS API calls are retried up to 3 times
- **Graceful Degradation**: Background job failures don't affect main API

---

## 🔐 **Security & Authentication**

### **Clerk JWT Authentication**

#### **JWT Verification Process:**
1. **Extract Token**: Get JWT from `Authorization: Bearer <token>` header
2. **JWKS Validation**: Verify token signature using Clerk's public keys
3. **Claims Validation**: Validate issuer, audience, and expiration
4. **User Lookup**: Find or create user in database using `clerkId`

#### **Implementation:**
```typescript
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

async function verifyClerkToken(token: string) {
  // 1. Decode token header
  const header = jwt.decode(token, { complete: true })?.header;
  
  // 2. Fetch Clerk's public keys
  const jwks = await fetchClerkJWKS();
  const key = jwks.keys.find(k => k.kid === header?.kid);
  
  // 3. Convert JWK to PEM and verify
  const pem = jwkToPem(key);
  const payload = jwt.verify(token, pem, {
    algorithms: ['RS256'],
    issuer: `https://${process.env.CLERK_DOMAIN}`,
    audience: process.env.CLERK_AUDIENCE
  });
  
  return payload;
}
```

### **AWS Security & Architecture**

CloudGuard implements a secure **assume role** architecture for multi-tenant AWS access:

#### **How It Works:**
1. **CloudGuard Service** has AWS credentials configured in environment variables
2. **Users** create IAM roles in their own AWS accounts
3. **Users** configure these roles to trust the CloudGuard service account
4. **CloudGuard** uses STS to assume user roles when accessing their resources
5. **All access** is logged in user's CloudTrail for full audit visibility

#### **Security Benefits:**
- ✅ **User Control**: Users retain full ownership of their data and costs
- ✅ **Revocable Access**: Users can disable CloudGuard access anytime
- ✅ **Audit Trail**: All CloudGuard actions logged in user's CloudTrail
- ✅ **Temporary Credentials**: Role sessions expire after 1 hour
- ✅ **External ID Security**: Additional security layer prevents confused deputy attacks

#### **Cross-Account IAM Role Trust Policy**

Users must create a role with this trust policy:

```json
{
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
          "sts:ExternalId": "user-unique-external-id"
        }
      }
    }
  ]
}
```

#### **Required AWS Permissions**

The IAM role must have these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudGuardReadOnlyAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:List*",
        "s3:Get*",
        "rds:Describe*",
        "lambda:List*",
        "lambda:Get*",
        "cloudformation:DescribeStacks",
        "cloudformation:ListStacks",
        "cloudformation:DetectStackDrift",
        "cloudformation:DescribeStackDriftDetectionStatus",
        "cloudformation:DescribeStackResources",
        "cloudformation:DescribeStackResourceDrifts",
        "ce:GetCostAndUsage",
        "ce:GetDimensionValues",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Additional Security Features**

- **Rate Limiting**: 10 requests per minute per user/IP
- **Request ID Tracking**: Unique ID for audit trails
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **CORS Protection**: Configured allowed origins
- **Security Headers**: Helmet.js for various security headers

---

## 🚀 **Development Workflow**

### **Local Development Setup**

1. **Environment Setup:**
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

2. **Database Development:**
```bash
# Start PostgreSQL (using Docker)
docker run --name cloudguard-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cloudguard_watch \
  -p 5432:5432 -d postgres:15

# Push schema to database
npm run db:push

# View database in Prisma Studio
npm run db:studio
```

3. **AWS Setup:**
```bash
# Configure AWS CLI (optional)
aws configure

# Test AWS connectivity
aws sts get-caller-identity
```

4. **Start Development:**
```bash
# Start backend with hot reload
npm run dev

# Backend runs on http://localhost:3001
# Test health check: curl http://localhost:3001/health
```

### **Testing API Endpoints**

#### **1. Test Authentication**
```bash
# Get Clerk JWT token from your frontend app
# Then test protected endpoints:

curl -X GET http://localhost:3001/api/aws-accounts \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

#### **2. Test AWS Connection**
```bash
curl -X POST http://localhost:3001/api/connect-aws \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN" \
  -d '{
    "accountId": "123456789012",
    "roleArn": "arn:aws:iam::123456789012:role/CloudGuardRole",
    "externalId": "test-external-id-123",
    "name": "Test Account",
    "region": "us-east-1"
  }'
```

#### **3. Test Resource Inventory**
```bash
curl -X GET http://localhost:3001/api/aws-resources \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"

curl -X GET "http://localhost:3001/api/aws-resources/details?type=ec2&limit=10" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

#### **4. Test Drift Detection**
```bash
# List stacks
curl -X GET http://localhost:3001/api/drift/stacks \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"

# Trigger drift detection
curl -X POST http://localhost:3001/api/drift/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN" \
  -d '{
    "accountId": "123456789012",
    "stackName": "my-stack",
    "region": "us-east-1"
  }'
```

#### **5. Test Cost Analytics**
```bash
# Get cost summary
curl -X GET "http://localhost:3001/api/cost/summary?days=30&granularity=DAILY" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"

# Get cost trends
curl -X GET "http://localhost:3001/api/cost/trends?days=30" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

---

## 📋 **Scripts & Commands**

### **Development Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm run dev` | Start development server with hot reload |
| **Build** | `npm run build` | Compile TypeScript to JavaScript |
| **Production** | `npm start` | Start production server |
| **Type Check** | `npm run type-check` | Run TypeScript type checking |

### **Database Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Generate Client** | `npm run db:generate` | Generate Prisma client from schema |
| **Push Schema** | `npm run db:push` | Push schema changes to database |
| **Studio** | `npm run db:studio` | Open Prisma Studio (database GUI) |
| **Reset** | `npm run db:reset` | Reset database (development only) |

### **Utility Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Clean** | `npm run clean` | Remove build artifacts |
| **Lint** | `npm run lint` | Run ESLint code linting |
| **Format** | `npm run format` | Format code with Prettier |

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Failed**
```
Error: Can't reach database server at localhost:5432
```
**Solutions:**
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Verify database exists: `psql -U user -d cloudguard_watch -c "\dt"`

#### **2. Clerk Authentication Failed**
```
Error: Invalid token signature
```
**Solutions:**
- Verify CLERK_DOMAIN in .env matches your Clerk app domain
- Check JWT token is valid and not expired
- Ensure frontend and backend use same Clerk app

#### **3. AWS Access Denied**
```
Error: User: arn:aws:sts::123456789012:assumed-role/CloudGuardRole is not authorized to perform: ec2:DescribeInstances
```
**Solutions:**
- Verify IAM role has required permissions (see AWS Security section)
- Check External ID matches between frontend and AWS role
- Ensure role ARN format is correct

#### **4. Drift Detection Stuck**
```
Drift detection jobs remain in DETECTION_IN_PROGRESS status
```
**Solutions:**
- Check background job logs for errors
- Verify CloudFormation permissions
- Restart server to reset background job processor

#### **5. Cost Explorer Access Denied**
```
Error: User is not authorized to perform: ce:GetCostAndUsage
```
**Solutions:**
- Add Cost Explorer permissions to IAM role
- Enable Cost Explorer in AWS billing console
- Wait up to 24 hours for Cost Explorer data availability

### **Debug Mode**

Enable debug logging:
```bash
# Set log level to debug
export LOG_LEVEL=debug

# Start server
npm run dev
```

### **Health Checks**

Verify system health:
```bash
# 1. Server health
curl http://localhost:3001/health

# 2. Database connectivity
npm run db:studio

# 3. Background jobs
# Check server logs for "Background drift detection jobs started"
```

---

## 🚀 **Production Deployment**

### **Production Checklist**

#### **Environment Configuration**
- [ ] Set `NODE_ENV=production`
- [ ] Configure production DATABASE_URL
- [ ] Set secure ALLOWED_ORIGINS (no localhost)
- [ ] Configure proper LOG_LEVEL (warn or error)
- [ ] Set production Clerk domain

#### **Security Hardening**
- [ ] Enable HTTPS/TLS certificates
- [ ] Configure load balancer health checks
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable CloudWatch/monitoring
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting at load balancer level

#### **Database Production Setup**
- [ ] Use managed PostgreSQL (RDS, Azure Database, etc.)
- [ ] Configure connection pooling
- [ ] Set up database backups
- [ ] Enable query logging (for debugging)
- [ ] Configure read replicas (if needed)

#### **AWS Production Setup**
- [ ] Use dedicated AWS account for CloudGuard infrastructure
- [ ] Set up cross-account role assumptions
- [ ] Enable CloudTrail for audit logging
- [ ] Configure AWS Config for compliance
- [ ] Set up Cost Explorer billing alerts

### **Docker Deployment**

#### **Dockerfile**
```dockerfile
FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application
COPY dist ./dist
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cloudguard -u 1001
USER cloudguard

# Expose port and start
EXPOSE 3001
CMD ["npm", "start"]
```

#### **Docker Compose**
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - CLERK_DOMAIN=${CLERK_DOMAIN}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=cloudguard_watch
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### **Kubernetes Deployment**

#### **Deployment Manifest**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudguard-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cloudguard-backend
  template:
    metadata:
      labels:
        app: cloudguard-backend
    spec:
      containers:
      - name: backend
        image: cloudguard/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cloudguard-secrets
              key: database-url
        - name: CLERK_DOMAIN
          valueFrom:
            configMapKeyRef:
              name: cloudguard-config
              key: clerk-domain
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 📊 **Monitoring & Observability**

### **Logging**

CloudGuard uses structured logging with different levels:

```typescript
// Log levels (in order of severity)
logger.fatal('System crash - immediate attention required');
logger.error('Request failed - user affected');
logger.warn('Degraded performance - monitor closely');
logger.info('Normal operation - audit trail');
logger.debug('Detailed debugging - development only');
```

### **Metrics to Monitor**

#### **Application Metrics**
- Request latency (p50, p95, p99)
- Request rate (requests per second)
- Error rate (4xx and 5xx responses)
- Authentication failures
- Background job processing times

#### **Business Metrics**
- Connected AWS accounts
- Resources monitored
- Drift detection runs
- Cost data freshness
- User activity

#### **Infrastructure Metrics**
- CPU and memory usage
- Database connection pool usage
- AWS API call rates and errors
- Network throughput

### **Alerting**

Set up alerts for:
- **High Error Rate**: >5% error rate for 5+ minutes
- **Database Issues**: Connection failures or slow queries
- **AWS API Limits**: Approaching rate limits
- **Background Job Failures**: Drift detection jobs failing
- **Authentication Issues**: High auth failure rate

---

## 🤝 **Contributing**

### **Development Standards**

#### **Code Style**
- **TypeScript**: Use strict mode, explicit types
- **Prisma**: Use typed client, avoid raw queries
- **Error Handling**: Always include request ID in errors
- **Validation**: Use Zod for all input validation
- **Logging**: Include context (userId, accountId, etc.)

#### **Git Workflow**
```bash
# Create feature branch
git checkout -b feature/add-new-endpoint

# Make changes and commit
git add .
git commit -m "feat: add new endpoint for resource filtering"

# Push and create PR
git push origin feature/add-new-endpoint
```

#### **Code Review Checklist**
- [ ] TypeScript types are explicit and correct
- [ ] Input validation with Zod schemas
- [ ] Error handling with proper status codes
- [ ] Request ID included in logs
- [ ] Database operations are properly typed
- [ ] AWS SDK operations include proper error handling
- [ ] Authentication middleware applied to protected routes

### **Testing Guidelines**

#### **Unit Tests**
- Test input validation schemas
- Test AWS helper functions with mocked SDK
- Test database operations with test database
- Test authentication middleware

#### **Integration Tests**
- Test full API endpoints with real database
- Test AWS integration with test account
- Test background job processing
- Test error scenarios and edge cases

---

## 📞 **Support & Resources**

### **Internal Documentation**
- **API Schemas**: See `src/types/index.ts` for all TypeScript interfaces
- **Database Schema**: See `prisma/schema.prisma` for complete data model
- **AWS Helpers**: See `src/lib/` for reusable AWS SDK functions
- **Route Handlers**: See `src/routes/` for endpoint implementations

### **External Resources**
- **Fastify Documentation**: https://www.fastify.io/docs/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **AWS SDK v3 Documentation**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/
- **Clerk Authentication**: https://clerk.com/docs

### **Getting Help**

For issues or questions:

1. **Check Logs**: Review server logs for error details and request IDs
2. **Verify Configuration**: Ensure all environment variables are correctly set
3. **Test Connectivity**: Verify database and AWS connectivity
4. **Review Documentation**: Check relevant sections in this README
5. **Check Dependencies**: Ensure all npm packages are up to date

### **Common Support Scenarios**

#### **New Developer Onboarding**
1. Follow Quick Start guide step-by-step
2. Set up development environment
3. Test all API endpoints with sample data
4. Review code structure and patterns
5. Make a small test change to verify setup

#### **Production Issues**
1. Check health endpoint: `/health`
2. Review application logs for errors
3. Verify database connectivity
4. Check AWS permissions and rate limits
5. Monitor background job processing

#### **Feature Development**
1. Review existing similar endpoints
2. Follow established patterns for validation and error handling
3. Add proper TypeScript types
4. Include request ID in all logs
5. Test with real AWS data

---

## 🔄 **Changelog & Versioning**

### **Version 1.0.0 - Current**

#### **Features**
- ✅ Multi-account AWS connection with IAM role assumption
- ✅ Real-time resource inventory (EC2, S3, Lambda, RDS)
- ✅ CloudFormation drift detection with background processing
- ✅ AWS Cost Explorer integration with trend analysis
- ✅ Unified dashboard data aggregation
- ✅ Clerk JWT authentication with JWKS validation
- ✅ Comprehensive error handling and logging
- ✅ Rate limiting and security headers
- ✅ PostgreSQL database with Prisma ORM

#### **Database Schema**
- ✅ Users, AwsAccounts, CloudFormationStack models
- ✅ StackDriftResult, DriftDetectionJob models
- ✅ CostEntry, CostSummary models
- ✅ Proper relations and constraints

#### **API Endpoints**
- ✅ 13 production-ready endpoints
- ✅ Comprehensive input validation
- ✅ Consistent error responses
- ✅ Pagination and filtering support

### **Planned Features (Future Versions)**

#### **Version 1.1.0**
- 🔄 Real-time WebSocket notifications
- 🔄 Advanced alerting and notifications
- 🔄 Resource tagging and organization
- 🔄 Custom dashboards and reports

#### **Version 1.2.0**
- 🔄 Multi-region support
- 🔄 Resource optimization recommendations
- 🔄 Advanced cost optimization insights
- 🔄 Integration with AWS Config

---

**CloudGuard Backend - Built for Enterprise AWS Monitoring** 🚀

For additional support or questions, please refer to the troubleshooting section or contact the development team. 