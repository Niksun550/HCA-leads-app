
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoaderCircle } from 'lucide-react';

export default function Home() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isInitialized, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
    </main>
  );
}
