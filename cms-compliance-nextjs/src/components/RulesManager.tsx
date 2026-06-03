'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { CompanyRule, PaginatedResponse } from '@/types/cms'

export default function RulesManager() {
  const [rules, setRules] = useState<CompanyRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0
  })
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<CompanyRule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ruleType: 'threshold',
    conditions: '{}',
    isActive: true,
    priority: 0
  })

  useEffect(() => {
    fetchRules()
  }, [pagination.page, search])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.perPage.toString(),
        ...(search && { search })
      })

      const response = await fetch(`/api/rules?${params}`)
      const data: PaginatedResponse = await response.json()

      if (data.success) {
        setRules(data.data)
        setPagination(data.pagination)
        setError(null)
      } else {
        setError('Failed to fetch rules')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          conditions: JSON.parse(formData.conditions)
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowCreateDialog(false)
        resetForm()
        fetchRules()
      } else {
        setError(result.error || 'Failed to create rule')
      }
    } catch (err) {
      setError('Network error')
    }
  }

  const handleUpdateRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          conditions: JSON.parse(formData.conditions)
        })
      })

      const result = await response.json()

      if (result.success) {
        setEditingRule(null)
        resetForm()
        fetchRules()
      } else {
        setError(result.error || 'Failed to update rule')
      }
    } catch (err) {
      setError('Network error')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        fetchRules()
      } else {
        setError(result.error || 'Failed to delete rule')
      }
    } catch (err) {
      setError('Network error')
    }
  }

  const handleToggleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      const result = await response.json()

      if (result.success) {
        fetchRules()
      } else {
        setError(result.error || 'Failed to update rule')
      }
    } catch (err) {
      setError('Network error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ruleType: 'threshold',
      conditions: '{}',
      isActive: true,
      priority: 0
    })
  }

  const openEditDialog = (rule: CompanyRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      conditions: JSON.stringify(rule.conditions, null, 2),
      isActive: rule.isActive,
      priority: rule.priority
    })
  }

  const getRuleTypeBadge = (ruleType: string) => {
    const types = {
      threshold: { label: 'Threshold', variant: 'default' as const },
      exclusion: { label: 'Exclusion', variant: 'destructive' as const },
      inclusion: { label: 'Inclusion', variant: 'secondary' as const },
      validation: { label: 'Validation', variant: 'outline' as const }
    }
    
    const type = types[ruleType as keyof typeof types] || types.validation
    return <Badge variant={type.variant}>{type.label}</Badge>
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      : <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rules Management</h2>
          <p className="text-muted-foreground">
            Manage company-specific compliance rules and validation criteria
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Rule</DialogTitle>
              <DialogDescription>
                Define a new compliance rule for CMS data validation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter rule name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleType">Rule Type</Label>
                  <Select value={formData.ruleType} onValueChange={(value) => setFormData(prev => ({ ...prev, ruleType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="threshold">Threshold</SelectItem>
                      <SelectItem value="exclusion">Exclusion</SelectItem>
                      <SelectItem value="inclusion">Inclusion</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="conditions">Conditions (JSON)</Label>
                <Textarea
                  id="conditions"
                  value={formData.conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder='{"field": "total_amount", "operator": ">", "value": 10}'
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule}>
                  Create Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-destructive rounded-lg bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Rules Found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'No rules match your search criteria' : 'Create your first compliance rule to get started'}
              </p>
              {!search && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rule.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRuleTypeBadge(rule.ruleType)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(rule.isActive)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(rule.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(rule.id, rule.isActive)}
                        >
                          {rule.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
            <DialogDescription>
              Update the compliance rule settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Rule Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter rule name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule does"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-ruleType">Rule Type</Label>
                <Select value={formData.ruleType} onValueChange={(value) => setFormData(prev => ({ ...prev, ruleType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threshold">Threshold</SelectItem>
                    <SelectItem value="exclusion">Exclusion</SelectItem>
                    <SelectItem value="inclusion">Inclusion</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-conditions">Conditions (JSON)</Label>
              <Textarea
                id="edit-conditions"
                value={formData.conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                placeholder='{"field": "total_amount", "operator": ">", "value": 10}'
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingRule && handleUpdateRule(editingRule.id)}>
                Update Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
