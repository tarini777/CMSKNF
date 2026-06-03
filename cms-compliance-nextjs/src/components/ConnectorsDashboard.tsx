'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plug, RefreshCw, Play, ArrowRight } from 'lucide-react'

interface FieldMapping {
  sourceField: string
  canonicalField: string
  required?: boolean
}

interface ConnectorDef {
  sourceKey: string
  displayName: string
  category: string
  mappingVersion: string
  description: string
  fieldMappings: FieldMapping[]
  sampleUpstreamPayload: Record<string, string>
}

export default function ConnectorsDashboard() {
  const [connectors, setConnectors] = useState<ConnectorDef[]>([])
  const [activeKey, setActiveKey] = useState('concur')
  const [sampleMap, setSampleMap] = useState<Record<string, unknown> | null>(null)
  const [ingestResult, setIngestResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const res = await fetch('/api/lineage/connectors?action=list')
    const json = await res.json()
    if (json.success) {
      setConnectors(json.data.connectors)
      if (json.data.connectors.length && !activeKey) {
        setActiveKey(json.data.connectors[0].sourceKey)
      }
    }
  }

  const loadSampleMap = async (sourceKey: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lineage/connectors?action=preview&sourceKey=${sourceKey}`)
      const json = await res.json()
      setSampleMap(json.success ? json.data : null)
      setIngestResult(null)
    } finally {
      setLoading(false)
    }
  }

  const runSampleIngest = async (sourceKey: string) => {
    const connector = connectors.find((c) => c.sourceKey === sourceKey)
    if (!connector) return
    setLoading(true)
    try {
      const res = await fetch('/api/lineage/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ingest',
          sourceKey,
          payload: connector.sampleUpstreamPayload,
        }),
      })
      const json = await res.json()
      setIngestResult(json.success ? json.data : { error: json.error })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (activeKey) loadSampleMap(activeKey)
  }, [activeKey, connectors.length])

  const active = connectors.find((c) => c.sourceKey === activeKey)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Source Connectors (Option 2)
            </CardTitle>
            <CardDescription>
              Concur, Veeva CRM, and vendor field mappings → SourceTransaction → SpendEvent → PUF
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadSampleMap(activeKey)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeKey} onValueChange={setActiveKey}>
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {connectors.map((c) => (
              <TabsTrigger key={c.sourceKey} value={c.sourceKey}>
                {c.displayName}
              </TabsTrigger>
            ))}
          </TabsList>

          {active && (
            <TabsContent value={active.sourceKey} className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge>{active.category}</Badge>
                <Badge variant="outline">{active.mappingVersion}</Badge>
                <span className="text-sm text-muted-foreground">{active.description}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Field mappings ({active.fieldMappings.length})</h4>
                  <div className="border rounded-lg max-h-72 overflow-y-auto text-sm">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Upstream</th>
                          <th className="p-2"></th>
                          <th className="text-left p-2">CMS canonical</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.fieldMappings.map((m) => (
                          <tr key={m.sourceField} className="border-t">
                            <td className="p-2 font-mono text-xs">
                              {m.sourceField}
                              {m.required && <span className="text-red-500 ml-1">*</span>}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              <ArrowRight className="w-3 h-3" />
                            </td>
                            <td className="p-2 font-mono text-xs">{m.canonicalField}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Sample mapping preview</h4>
                  {sampleMap ? (
                    <pre className="text-xs bg-muted/40 p-3 rounded-lg overflow-auto max-h-48">
                      {JSON.stringify(
                        {
                          externalTransactionId: sampleMap.externalTransactionId,
                          missingRequired: sampleMap.missingRequired,
                          canonicalRow: sampleMap.canonicalRow,
                        },
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  )}

                  <Button size="sm" onClick={() => runSampleIngest(active.sourceKey)} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" />
                    Ingest sample into lineage
                  </Button>

                  {ingestResult && (
                    <pre className="text-xs bg-green-50 dark:bg-green-950/30 p-3 rounded-lg overflow-auto max-h-40">
                      {JSON.stringify(ingestResult, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
