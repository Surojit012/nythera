import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

// Initialize the Privy server client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
);

export type AuthContext = {
  userId: string;
  walletAddress: string; // The guaranteed canonical wallet
};

/**
 * Higher-order function to wrap API route handlers with Privy authentication.
 * Extracts the Bearer token, verifies it, fetches the user, and guarantees a connected wallet.
 */
export function withAuth(
  handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace(/^Bearer\s+/, '');
      if (!token) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
      }

      // Verify JWT
      const claims = await privy.verifyAuthToken(token);
      
      // Fetch user to get canonical wallet (works for both wallet & email users)
      const user = await privy.getUser(claims.userId);
      const walletAddress = user.wallet?.address?.toLowerCase();
      
      if (!walletAddress) {
        return NextResponse.json({ error: 'Authenticated user has no wallet connected.' }, { status: 401 });
      }

      // Pass control to the actual route handler with guaranteed identity
      return await handler(request, { userId: claims.userId, walletAddress });
    } catch (error) {
      console.error('[AUTH_ERROR]', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  };
}
