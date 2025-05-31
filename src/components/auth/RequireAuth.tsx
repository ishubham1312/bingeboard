'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_PATHS = ['/login']; // Add other public paths here if needed

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user && !PUBLIC_PATHS.includes(pathname)) {
      // Preserve the current URL as the redirect destination
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  // If we're on a protected route and not authenticated, don't render anything
  // This prevents flash of protected content
  if (!loading && !user && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
