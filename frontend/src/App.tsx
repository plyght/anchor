import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { authClient } from './lib/auth-client';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProfilePage from './pages/ProfilePage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import OnboardingPage from './pages/OnboardingPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = session !== null;
  const hasCompletedOnboarding = useQuery(
    api.volunteers.hasCompletedOnboarding,
    isAuthenticated ? {} : "skip"
  );
  const location = useLocation();

  console.log('[RequireOnboarding] State:', { 
    isAuthenticated, 
    isPending, 
    hasCompletedOnboarding,
    path: location.pathname 
  });

  if (isPending) {
    console.log('[RequireOnboarding] Auth loading, showing loading screen');
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log('[RequireOnboarding] Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (hasCompletedOnboarding === undefined) {
    console.log('[RequireOnboarding] Waiting for onboarding status...');
    return <LoadingScreen />;
  }

  if (!hasCompletedOnboarding) {
    console.log('[RequireOnboarding] Onboarding incomplete, redirecting');
    return <Navigate to="/onboarding" replace />;
  }

  console.log('[RequireOnboarding] All checks passed, rendering protected content');
  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = session !== null;
  const hasCompletedOnboarding = useQuery(
    api.volunteers.hasCompletedOnboarding,
    isAuthenticated ? {} : "skip"
  );

  console.log('[RedirectIfAuthenticated] State:', { 
    isAuthenticated, 
    isPending, 
    hasCompletedOnboarding 
  });

  if (isPending) {
    console.log('[RedirectIfAuthenticated] Showing loading screen (isPending=true)');
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    console.log('[RedirectIfAuthenticated] User is authenticated');
    if (hasCompletedOnboarding === undefined) {
      console.log('[RedirectIfAuthenticated] Waiting for onboarding status...');
      return <LoadingScreen />;
    }
    if (!hasCompletedOnboarding) {
      console.log('[RedirectIfAuthenticated] Redirecting to onboarding');
      return <Navigate to="/onboarding" replace />;
    }
    console.log('[RedirectIfAuthenticated] Redirecting to dashboard');
    return <Navigate to="/" replace />;
  }

  console.log('[RedirectIfAuthenticated] User not authenticated, showing login page');
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = session !== null;
  const hasCompletedOnboarding = useQuery(
    api.volunteers.hasCompletedOnboarding,
    isAuthenticated ? {} : "skip"
  );

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasCompletedOnboarding === undefined) {
    return <LoadingScreen />;
  }

  if (hasCompletedOnboarding) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireOnboarding>
              <DashboardPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireOnboarding>
              <AdminDashboardPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireOnboarding>
              <ProfilePage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/incidents/:id"
          element={
            <RequireOnboarding>
              <IncidentDetailPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/onboarding"
          element={
            <OnboardingGuard>
              <OnboardingPage />
            </OnboardingGuard>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <SignupPage />
            </RedirectIfAuthenticated>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
