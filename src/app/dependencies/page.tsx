"use client"

import { Network, FileCode, Cloud, BookOpen, FileSpreadsheet, Folder } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockScripts } from "@/lib/data/mock-data"
import Link from "next/link"

export default function DependenciesPage() {
  // Collect all unique APIs and libraries
  const allAPIs = [...new Set(mockScripts.flatMap(s => s.externalAPIs))]
  const allLibraries = [...new Set(mockScripts.flatMap(s => s.sharedLibraries))]
  const allFiles = mockScripts.flatMap(s => s.connectedFiles)

  // Group scripts by API
  const scriptsByAPI = allAPIs.reduce((acc, api) => {
    acc[api] = mockScripts.filter(s => s.externalAPIs.includes(api))
    return acc
  }, {} as Record<string, typeof mockScripts>)

  // Group scripts by library
  const scriptsByLibrary = allLibraries.reduce((acc, lib) => {
    acc[lib] = mockScripts.filter(s => s.sharedLibraries.includes(lib))
    return acc
  }, {} as Record<string, typeof mockScripts>)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dependencies</h1>
          <p className="text-muted-foreground">
            Visualize relationships between scripts, APIs, and files
          </p>
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dependencies</SelectItem>
            <SelectItem value="apis">External APIs</SelectItem>
            <SelectItem value="libraries">Shared Libraries</SelectItem>
            <SelectItem value="files">Connected Files</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scripts</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockScripts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">External APIs</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allAPIs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Libraries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allLibraries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Files</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allFiles.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* External APIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            External APIs
          </CardTitle>
          <CardDescription>APIs used by your scripts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allAPIs.map((api) => (
              <div key={api} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{api}</span>
                  </div>
                  <Badge variant="secondary">
                    {scriptsByAPI[api].length} script{scriptsByAPI[api].length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scriptsByAPI[api].map((script) => (
                    <Link
                      key={script.id}
                      href={`/scripts/${script.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm hover:bg-muted/80"
                    >
                      <FileCode className="h-3 w-3" />
                      {script.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shared Libraries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Shared Libraries
          </CardTitle>
          <CardDescription>Common code libraries across scripts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allLibraries.map((lib) => (
              <div key={lib} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{lib}</span>
                  </div>
                  <Badge variant="secondary">
                    {scriptsByLibrary[lib].length} script{scriptsByLibrary[lib].length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scriptsByLibrary[lib].map((script) => (
                    <Link
                      key={script.id}
                      href={`/scripts/${script.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm hover:bg-muted/80"
                    >
                      <FileCode className="h-3 w-3" />
                      {script.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dependency Matrix Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
          <CardDescription>Understanding the dependency types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-500" />
              <span className="text-sm">External API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-purple-500" />
              <span className="text-sm">Shared Library</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500" />
              <span className="text-sm">Spreadsheet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-orange-500" />
              <span className="text-sm">Document</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
