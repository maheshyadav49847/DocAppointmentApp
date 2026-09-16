import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { onboardingService } from '@/services/onboardingService';
import { PageLoader } from '@/components/ui/PageLoader';
import { Clock, LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface OnboardingRouteGuardProps {
  children: React.ReactNode;
}

export function OnboardingRouteGuard({ children }: OnboardingRouteGuardProps) {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const location = useLocation();

  const role = user?.role?.toLowerCase().replace(/\s/g, '') || '';
  const isOrgAdmin = role === 'orgadmin' || role === 'superadmin';

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingService.getStatus,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1
  });

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <PageLoader />;
  }

  const isOnboarded = status?.isOnboarded ?? true;
  const isOnboardingRoute = location.pathname === '/onboarding';

  // 1. If onboarding is INCOMPLETE
  if (!isOnboarded) {
    if (isOrgAdmin) {
      if (!isOnboardingRoute) {
        return <Navigate to="/onboarding" replace />;
      }
      return <>{children}</>;
    } else {
      // Non-admin staff (e.g. Receptionist) logging into an unconfigured tenant
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="saas-card max-w-md w-full p-8 text-center space-y-6">
            <div className="flex justify-center">
              <BrandLogo theme="light" size="md" align="center" showSubtitle />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Clinic Setup in Progress</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Your clinic administrator is currently setting up the clinic profile, doctor schedules, and consultation services.
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-2">
                Please contact your administrator or check back in a few minutes.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => clearAuth()}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 2. If onboarding is COMPLETED and user tries to visit /onboarding
  if (isOnboarded && isOnboardingRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
