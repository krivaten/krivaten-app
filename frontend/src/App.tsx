import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthenticatedLayout } from "./layouts/AuthenticatedLayout";
import { UnauthenticatedLayout } from "./layouts/UnauthenticatedLayout";
import { Toaster } from "sonner";

const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfileEdit = lazy(() => import("./pages/profile/Edit"));
const Entities = lazy(() => import("./pages/Entities"));
const EntityDetail = lazy(() => import("./pages/EntityDetail"));
const Observations = lazy(() => import("./pages/Observations"));
const Vocabularies = lazy(() => import("./pages/Vocabularies"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<UnauthenticatedLayout />}>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>
            <Route element={<AuthenticatedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entities" element={<Entities />} />
              <Route path="/entities/:id" element={<EntityDetail />} />
              <Route path="/observations" element={<Observations />} />
              <Route path="/vocabularies" element={<Vocabularies />} />
              <Route path="/profile" element={<ProfileEdit />} />
            </Route>
          </Routes>
        </Suspense>
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
