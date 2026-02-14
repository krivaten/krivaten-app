import { useAuth } from '@/contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-3xl font-display lowercase tracking-wider mb-4">Welcome</h1>
      <p className="text-muted-foreground">
        Signed in as {user?.email}
      </p>
    </div>
  )
}
