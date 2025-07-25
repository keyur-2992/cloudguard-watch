import jwt from 'jsonwebtoken';
import { ClerkJWTPayload, User, AuthContext, ApiError } from '../types';
import { prisma } from '../prisma/client';

// Cache for JWKS keys
let jwksCache: any = null;
let cacheExpiry: number = 0;

// Fetch JWKS from Clerk
async function fetchJWKS(): Promise<any> {
  const now = Date.now();
  if (jwksCache && now < cacheExpiry) {
    return jwksCache;
  }

  try {
    const response = await fetch(`https://${process.env.CLERK_DOMAIN}/.well-known/jwks.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }
    
    const jwks = await response.json();
    jwksCache = jwks;
    cacheExpiry = now + (5 * 60 * 1000); // Cache for 5 minutes
    return jwks;
  } catch (error) {
    throw new ApiError('Failed to fetch JWKS');
  }
}

// Get signing key from JWKS
async function getKey(header: jwt.JwtHeader): Promise<string> {
  try {
    const jwks = await fetchJWKS();
    const key = jwks.keys.find((k: any) => k.kid === header.kid);
    
    if (!key) {
      throw new Error(`Key ${header.kid} not found`);
    }

    // Convert JWK to PEM format
    const jwkToPem = require('jwk-to-pem');
    return jwkToPem(key);
  } catch (error) {
    throw new ApiError('Failed to get signing key');
  }
}

// Verify and decode Clerk JWT token
export async function verifyClerkToken(token: string): Promise<ClerkJWTPayload> {
  try {
    if (!token) {
      const error = new ApiError('No token provided');
      error.statusCode = 401;
      throw error;
    }

    // Remove Bearer prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Decode token header to get kid
    const decoded = jwt.decode(cleanToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      const error = new ApiError('Invalid token format');
      error.statusCode = 401;
      throw error;
    }

    // Get public key
    const publicKey = await getKey(decoded.header);

    // Verify token
    const payload = jwt.verify(cleanToken, publicKey, {
      algorithms: ['RS256'],
      issuer: `https://${process.env.CLERK_DOMAIN}`,
      // Comment out audience check temporarily for debugging
      // audience: process.env.CLERK_AUDIENCE || 'clerk',
    }) as ClerkJWTPayload;

    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const apiError = new ApiError('Invalid token');
      apiError.statusCode = 401;
      throw apiError;
    }
    if (error instanceof jwt.TokenExpiredError) {
      const apiError = new ApiError('Token expired');
      apiError.statusCode = 401;
      throw apiError;
    }
    throw error;
  }
}

// Get or create user from Clerk token
export async function getOrCreateUser(clerkPayload: ClerkJWTPayload): Promise<User> {
  try {
    const clerkId = clerkPayload.sub;
    
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    // If user doesn't exist, create them
    if (!user) {
      // Extract email from Clerk payload
      const email = clerkPayload.email || clerkPayload.email_addresses?.[0]?.email_address;
      
      if (!email) {
        const error = new ApiError('No email found in token');
        error.statusCode = 400;
        throw error;
      }

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
        },
      });
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    const apiError = new ApiError('Failed to get or create user');
    apiError.statusCode = 500;
    throw apiError;
  }
}

// Complete authentication flow: verify token and get user
export async function authenticateUser(authHeader: string | undefined): Promise<AuthContext> {
  try {
    if (!authHeader) {
      const error = new ApiError('No authorization header');
      error.statusCode = 401;
      throw error;
    }

    // Verify Clerk token
    const clerkPayload = await verifyClerkToken(authHeader);
    
    // Get or create user
    const user = await getOrCreateUser(clerkPayload);

    return {
      user,
      clerkUserId: clerkPayload.sub,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    const apiError = new ApiError('Authentication failed');
    apiError.statusCode = 401;
    throw apiError;
  }
}

// Validate environment variables
export function validateAuthConfig(): void {
  const required = ['CLERK_DOMAIN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
} 