'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, RefreshCw } from 'lucide-react'

interface NppesHealth {
  ok: boolean
  apiVersion: string
  endpoint: string
  message: string
}

interface VerifyResult {
  valid: boolean
  npi: string
  nameMatch: boolean | null
  matchScore: number
  message: string
  source: string
  provider?: {
    firstName?: string
    lastName?: string
    organizationName?: string
    specialty?: string
    city?: string
    state?: string
    enumerationType?: string
    recipientType?: string
  }
}

export default function NppesConnectorPanel() {
  const [health, setHealth] = useState<NppesHealth | null>(null)
  const [npi, setNpi] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHealth = async () => {
    try {
      const res = await fetch('/api/connectors/nppes')
      const json = await res.json()
      if (json.success) setHealth(json.data.health)
    } catch {
      setHealth(null)
    }
  }

  const verify = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/connectors/nppes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          npi,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Verification failed')
        return
      }
      setResult(json.data)
    } catch {
      setError('NPPES connector request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              NPPES HCP Verification
            </CardTitle>
            <CardDescription>
              CMS NPPES Read API v2.1 — real-time NPI lookup for HCP identity verification (read-only)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadHealth}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Health
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline">mdm</Badge>
          <Badge variant="outline">API v2.1</Badge>
          <Badge variant="outline">read-only</Badge>
          {health && (
            <Badge variant={health.ok ? 'default' : 'destructive'}>
              {health.ok ? 'Connected' : 'Unavailable'}
            </Badge>
          )}
        </div>

        {health && (
          <p className="text-sm text-muted-foreground">{health.message}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="nppes-npi">NPI (10 digits)</Label>
            <Input
              id="nppes-npi"
              placeholder="1234567890"
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="nppes-first">First name (optional)</Label>
            <Input
              id="nppes-first"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="nppes-last">Last name (optional)</Label>
            <Input
              id="nppes-last"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={verify} disabled={loading || !npi.trim()}>
          {loading ? 'Verifying…' : 'Verify NPI'}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={result.valid ? 'default' : 'destructive'}>
                {result.valid ? 'Valid NPI' : 'Invalid / not found'}
              </Badge>
              {result.nameMatch != null && (
                <Badge variant={result.nameMatch ? 'default' : 'secondary'}>
                  {result.nameMatch ? 'Name match' : 'Name mismatch'}
                </Badge>
              )}
              <Badge variant="outline">{result.source}</Badge>
            </div>
            <p>{result.message}</p>
            {result.provider && (
              <pre className="text-xs bg-muted/40 p-2 rounded overflow-auto">
                {JSON.stringify(result.provider, null, 2)}
              </pre>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          NPI issuance does not validate licensure or credentialing. See CMS NPI guidance for details.
        </p>
      </CardContent>
    </Card>
  )
}
