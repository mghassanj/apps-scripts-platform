"use client"

import { useEffect, useState } from "react"
import { Plus, Download, Upload, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScriptsTable } from "@/components/scripts-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Script } from "@/types"

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  async function fetchScripts() {
    try {
      setLoading(true)
      const response = await fetch('/api/scripts')
      if (!response.ok) {
        throw new Error('Failed to fetch scripts')
      }
      const data = await response.json()
      setScripts(data.scripts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScripts()
  }, [])

  async function handleSync() {
    setSyncing(true)
    await fetchScripts()
    setSyncing(false)
  }

  const allScripts = scripts
  const activeScripts = scripts.filter(s => s.status !== "inactive")
  const inactiveScripts = scripts.filter(s => s.status === "inactive")
  const errorScripts = scripts.filter(s => s.status === "error" || s.status === "warning")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading scripts from Google Drive...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Scripts</AlertTitle>
        <AlertDescription>
          {error}. Make sure you have authenticated with clasp.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scripts</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your Google Apps Scripts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Pull All
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Push All
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Script
          </Button>
        </div>
      </div>

      {/* Tabs with filtered tables */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({allScripts.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeScripts.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveScripts.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-orange-600">
            Issues ({errorScripts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ScriptsTable data={allScripts} />
        </TabsContent>

        <TabsContent value="active">
          <ScriptsTable data={activeScripts} />
        </TabsContent>

        <TabsContent value="inactive">
          <ScriptsTable data={inactiveScripts} />
        </TabsContent>

        <TabsContent value="issues">
          <ScriptsTable data={errorScripts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
