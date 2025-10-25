import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { PwaInstaller } from '@/components/pwa-installer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});


export const metadata: Metadata = {
  title: 'SolarLeads CRM',
  description: 'A lead management tool for solar energy sales teams.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <meta name="application-name" content="SolarLeads CRM" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SolarLeads CRM" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={cn('font-body antialiased', inter.variable)}>
        <AuthProvider>
          {children}
          <Toaster />
          <PwaInstaller />
        </AuthProvider>
      </body>
    </html>
  );
}
