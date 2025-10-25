
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowDownToLine } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function PwaInstaller() {
  const isMobile = useIsMobile();
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOsDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOsDevice);
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const dismissed = localStorage.getItem('pwaInstallBannerDismissed');
      
      if (isMobile && !isStandalone && !dismissed) {
        setShowInstallBanner(true);
      }
    }
  }, [isMobile]);

  const handleDismiss = () => {
    localStorage.setItem('pwaInstallBannerDismissed', 'true');
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 p-4 border-t shadow-lg backdrop-blur-sm sm:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <ArrowDownToLine className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Install SolarLeads App</p>
              <p className="text-sm text-muted-foreground">
                {isIOS 
                  ? "Tap the Share icon, then 'Add to Home Screen'."
                  : "Add to your home screen for a better experience."
                }
              </p>
            </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0">
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

    