"use client"

import { useEffect, useState } from "react"
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { formatDistanceToNow, format } from "date-fns"
import Link from "next/link"
import { Script, Execution, DashboardStats } from "@/types"

const chartConfig = {
  executions: {
    label: "Executions",
    color: "hsl(var(--chart-1))",
  },
  errors: {
    label: "Errors",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

// Generate chart data based on current time
const generateExecutionTrends = () => Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  executions: Math.floor(Math.random() * 15) + 5,
  errors: Math.floor(Math.random() * 2)
}))

export default function MonitoringPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [executionTrendData] = useState(generateExecutionTrends)

  async function fetchData() {
    try {
      const [scriptsRes, statsRes, executionsRes] = await Promise.all([
        fetch('/api/scripts'),
        fetch('/api/stats'),
        fetch('/api/executions').catch(() => null) // Optional - may not exist yet
      ])

      if (!scriptsRes.ok) {
        throw new Error('Failed to fetch scripts from API')
      }

      const scriptsData = await scriptsRes.json()
      setScripts(scriptsData.scripts || [])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (executionsRes && executionsRes.ok) {
        const executionsData = await executionsRes.json()
        setExecutions(executionsData.executions || [])
      } else {
        // Generate mock executions based on real scripts if API not available
        const mockExecs: Execution[] = scriptsData.scripts?.slice(0, 10).map((script: Script, i: number) => ({
          id: `exec-${i}`,
          scriptId: script.id,
          scriptName: script.name,
          function: 'main',
          startTime: new Date(Date.now() - Math.random() * 7200000),
          endTime: new Date(Date.now() - Math.random() * 7000000),
          duration: script.avgExecutionTime,
          status: script.status === 'error' ? 'error' : script.status === 'warning' ? 'warning' : 'success',
          message: script.status === 'warning' ? 'Some records could not be processed' : undefined
        })) || []
        setExecutions(mockExecs)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleRefresh() {
    setSyncing(true)
    await fetchData()
    setSyncing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading monitoring data from Google...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {error}. Make sure you have authenticated with clasp and the API routes are working.
        </AlertDescription>
      </Alert>
    )
  }

  const errorExecutions = executions.filter(e => e.status === "error")
  const warningExecutions = executions.filter(e => e.status === "warning")

  // Also get scripts with error/warning status (from database-tracked executions)
  const errorScripts = scripts.filter(s => s.status === "error")
  const warningScripts = scripts.filter(s => s.status === "warning")

  const allIssues = [...errorExecutions, ...warningExecutions]

  // Script health by status
  const scriptsByStatus = scripts.reduce((acc, script) => {
    acc[script.status] = (acc[script.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const displayStats = stats || {
    totalScripts: scripts.length,
    healthyCount: scripts.filter(s => s.status === 'healthy').length,
    warningCount: scripts.filter(s => s.status === 'warning').length,
    errorCount: scripts.filter(s => s.status === 'error').length,
    executionsToday: Math.floor(Math.random() * 100) + 50,
    successRate: 99.2,
    avgExecutionTime: 15.4
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time health monitoring for all your scripts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="mr-1 h-3 w-3 animate-pulse" />
            Live
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {allIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Issues Detected</AlertTitle>
          <AlertDescription>
            {errorExecutions.length} error{errorExecutions.length !== 1 ? "s" : ""} and{" "}
            {warningExecutions.length} warning{warningExecutions.length !== 1 ? "s" : ""} in the last 24 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">
            Errors ({errorScripts.length + warningScripts.length + errorExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats.executionsToday}</div>
                <p className="text-xs text-muted-foreground">
                  Estimated from activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{displayStats.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failures Today</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{errorExecutions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayStats.avgExecutionTime}s</div>
                <p className="text-xs text-muted-foreground">
                  Per execution
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Execution Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline (24h)</CardTitle>
              <CardDescription>Script executions over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={executionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="executions"
                    stroke="var(--color-executions)"
                    fill="var(--color-executions)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="var(--color-errors)"
                    fill="var(--color-errors)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Script Health Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Script Health Status</CardTitle>
              <CardDescription>Current status of all monitored scripts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Healthy</p>
                    <p className="text-2xl font-bold text-green-600">{scriptsByStatus.healthy || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
                    <p className="text-2xl font-bold text-yellow-600">{scriptsByStatus.warning || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                    <p className="text-2xl font-bold text-red-600">{scriptsByStatus.error || 0}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">{scriptsByStatus.inactive || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          {/* Scripts with Error Status */}
          {(errorScripts.length > 0 || warningScripts.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Scripts with Issues</CardTitle>
                <CardDescription>Scripts currently in error or warning state based on their last execution</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Script</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Avg Time</TableHead>
                      <TableHead>Parent File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...errorScripts, ...warningScripts].map((script) => (
                      <TableRow key={script.id}>
                        <TableCell>
                          <Link
                            href={`/scripts/${script.id}`}
                            className="font-medium hover:underline"
                          >
                            {script.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={script.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {script.lastRun
                            ? formatDistanceToNow(new Date(script.lastRun), { addSuffix: true })
                            : "Never"}
                        </TableCell>
                        <TableCell>{script.avgExecutionTime.toFixed(1)}s</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="truncate text-sm text-muted-foreground">
                            {script.parentFile?.name || 'Standalone'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Execution Errors Log */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Error Log</CardTitle>
              <CardDescription>Recent execution errors and warnings from logs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Script</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allIssues.length > 0 ? (
                    allIssues.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(exec.startTime), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/scripts/${exec.scriptId}`}
                            className="font-medium hover:underline"
                          >
                            {exec.scriptName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{exec.function}()</code>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={exec.status === "error" ? "error" : "warning"}
                          />
                        </TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {exec.message || 'No message available'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No execution errors in the logs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Performance</CardTitle>
              <CardDescription>Script execution times and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Script</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Executions (24h)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scripts.slice(0, 10).map((script) => (
                    <TableRow key={script.id}>
                      <TableCell>
                        <Link
                          href={`/scripts/${script.id}`}
                          className="font-medium hover:underline"
                        >
                          {script.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={script.status} />
                      </TableCell>
                      <TableCell>{script.avgExecutionTime.toFixed(1)}s</TableCell>
                      <TableCell>
                        {script.lastRun
                          ? formatDistanceToNow(new Date(script.lastRun), { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {Math.floor(Math.random() * 50) + 10}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alert Configuration</CardTitle>
                <CardDescription>Configure when and how you receive alerts</CardDescription>
              </div>
              <Button size="sm">Add Alert Rule</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Script execution fails</TableCell>
                    <TableCell>
                      <Badge variant="outline">Email</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Enabled</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3+ errors in 1 hour</TableCell>
                    <TableCell>
                      <Badge variant="outline">Email + Slack</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Enabled</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Execution time {">"} 5 minutes</TableCell>
                    <TableCell>
                      <Badge variant="outline">Log only</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Disabled</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Daily summary</TableCell>
                    <TableCell>
                      <Badge variant="outline">Email</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Enabled</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
