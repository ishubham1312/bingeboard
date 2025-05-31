'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const PUBLIC_PATHS = ['/login'];
const HOME_PATH = '/';

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If user is not logged in and trying to access a protected route
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace('/login');
        }
      } else {
        // If user is logged in and trying to access login page
        if (PUBLIC_PATHS.includes(pathname)) {
          router.replace(HOME_PATH);
        }
      }
    }
  }, [user, loading, router, pathname]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't show protected content if user is not authenticated
  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  // Don't show login page if user is authenticated
  if (user && PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
