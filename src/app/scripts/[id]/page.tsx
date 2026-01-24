"use client"

import { use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Download,
  Upload,
  Settings,
  Clock,
  Calendar,
  User,
  FileCode,
  Link2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { mockScripts, mockExecutions } from "@/lib/data/mock-data"
import { formatDistanceToNow, format } from "date-fns"

interface ScriptDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ScriptDetailPage({ params }: ScriptDetailPageProps) {
  const { id } = use(params)
  const script = mockScripts.find((s) => s.id === id)

  if (!script) {
    notFound()
  }

  const scriptExecutions = mockExecutions.filter((e) => e.scriptId === script.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/scripts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{script.name}</h1>
            <StatusBadge status={script.status} />
          </div>
          <p className="text-muted-foreground">{script.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileCode className="h-4 w-4" />
              {script.parentFile.name}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {script.owner}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Pull
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Push
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Run Now
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={script.parentFile.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Editor
            </a>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Run</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {script.lastRun
                    ? formatDistanceToNow(script.lastRun, { addSuffix: true })
                    : "Never"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Run</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {script.nextRun
                    ? formatDistanceToNow(script.nextRun, { addSuffix: true })
                    : "Not scheduled"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{script.avgExecutionTime.toFixed(1)}s</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Type</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {script.type.replace("-", " ")}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>External APIs</CardTitle>
                <CardDescription>APIs this script connects to</CardDescription>
              </CardHeader>
              <CardContent>
                {script.externalAPIs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {script.externalAPIs.map((api) => (
                      <Badge key={api} variant="secondary">
                        {api}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No external APIs</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shared Libraries</CardTitle>
                <CardDescription>Libraries used by this script</CardDescription>
              </CardHeader>
              <CardContent>
                {script.sharedLibraries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {script.sharedLibraries.map((lib) => (
                      <Badge key={lib} variant="outline">
                        {lib}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No shared libraries</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connected Files</CardTitle>
              <CardDescription>Files this script reads from or writes to</CardDescription>
            </CardHeader>
            <CardContent>
              {script.connectedFiles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {script.connectedFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          {file.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {file.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {file.accessType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No connected files</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Recent executions of this script</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scriptExecutions.length > 0 ? (
                    scriptExecutions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell>
                          {format(exec.startTime, "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{exec.function}()</code>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              exec.status === "success"
                                ? "healthy"
                                : exec.status === "warning"
                                ? "warning"
                                : "error"
                            }
                          />
                        </TableCell>
                        <TableCell>{exec.duration.toFixed(1)}s</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {exec.message || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No execution history available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Configured Triggers</CardTitle>
                <CardDescription>Automated execution schedules</CardDescription>
              </div>
              <Button size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Add Trigger
              </Button>
            </CardHeader>
            <CardContent>
              {script.triggers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last Fire</TableHead>
                      <TableHead>Next Fire</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {script.triggers.map((trigger) => (
                      <TableRow key={trigger.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {trigger.type.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{trigger.function}()</code>
                        </TableCell>
                        <TableCell>
                          {trigger.schedule || "Event-based"}
                        </TableCell>
                        <TableCell>
                          {trigger.lastFire
                            ? formatDistanceToNow(trigger.lastFire, { addSuffix: true })
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {trigger.nextFire
                            ? formatDistanceToNow(trigger.nextFire, { addSuffix: true })
                            : "On event"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={trigger.status === "enabled" ? "default" : "secondary"}
                          >
                            {trigger.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No triggers configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>External APIs</CardTitle>
                <CardDescription>External services this script depends on</CardDescription>
              </CardHeader>
              <CardContent>
                {script.externalAPIs.length > 0 ? (
                  <div className="space-y-2">
                    {script.externalAPIs.map((api) => (
                      <div
                        key={api}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="font-medium">{api}</span>
                        <Badge variant="outline">External</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No external APIs</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shared Libraries</CardTitle>
                <CardDescription>Common code libraries used</CardDescription>
              </CardHeader>
              <CardContent>
                {script.sharedLibraries.length > 0 ? (
                  <div className="space-y-2">
                    {script.sharedLibraries.map((lib) => (
                      <div
                        key={lib}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="font-medium">{lib}</span>
                        <Badge variant="outline">Library</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No shared libraries</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connected Files</CardTitle>
              <CardDescription>Google Sheets, Docs, and Drive files</CardDescription>
            </CardHeader>
            <CardContent>
              {script.connectedFiles.length > 0 ? (
                <div className="space-y-2">
                  {script.connectedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {file.type}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {file.accessType}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No connected files</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Script Information</CardTitle>
              <CardDescription>Basic information about this script</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Script ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{script.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Parent File</label>
                  <p className="text-sm text-muted-foreground">{script.parentFile.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Owner</label>
                  <p className="text-sm text-muted-foreground">{script.owner}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {script.type.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {format(script.createdAt, "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Modified</label>
                  <p className="text-sm text-muted-foreground">
                    {format(script.updatedAt, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-800">
                <div>
                  <p className="font-medium">Disable Script</p>
                  <p className="text-sm text-muted-foreground">
                    Disable all triggers and stop automatic executions
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Disable
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
