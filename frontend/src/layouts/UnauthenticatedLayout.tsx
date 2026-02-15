import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

export function UnauthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Logo className="size-8" />
          <span className="font-display text-xl lowercase tracking-wider">
            Sondering
          </span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
