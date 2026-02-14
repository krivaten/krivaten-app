import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { UnauthenticatedLayout } from './layouts/UnauthenticatedLayout'

const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">Loading...</div>
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
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
