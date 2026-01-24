"use client"

import { Plus, Download, Upload, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScriptsTable } from "@/components/scripts-table"
import { mockScripts } from "@/lib/data/mock-data"

export default function ScriptsPage() {
  const allScripts = mockScripts
  const activeScripts = mockScripts.filter(s => s.status !== "inactive")
  const inactiveScripts = mockScripts.filter(s => s.status === "inactive")
  const errorScripts = mockScripts.filter(s => s.status === "error" || s.status === "warning")

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
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
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
