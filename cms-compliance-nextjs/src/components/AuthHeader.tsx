'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LogIn, LogOut, User } from 'lucide-react'
import { UserRole } from '@/types/cms'

interface SessionUser {
  email: string
  name: string
  role: UserRole
}

export default function AuthHeader() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [email, setEmail] = useState('admin@cms-compliance.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const loadSession = async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        setUser(data.data)
      }
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  const login = async () => {
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.success) {
      setUser(data.data)
      setOpen(false)
    } else {
      setError(data.error || 'Login failed')
    }
  }

  const logout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          <User className="w-3 h-3 mr-1" />
          {user.name} ({user.role})
        </Badge>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to CMS Compliance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={login}>
            Sign In
          </Button>
          <p className="text-xs text-muted-foreground">
            Demo: admin@cms-compliance.local / admin123 (run npm run db:seed)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
