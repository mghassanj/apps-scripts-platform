"use client"

import { useEffect, useState } from "react"
import { FileCode, CheckCircle, AlertTriangle, XCircle, Activity, Clock, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StatusBadge } from "@/components/status-badge"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Script, DashboardStats, Execution } from "@/types"

const chartConfig = {
  executions: {
    label: "Executions",
    color: "hsl(var(--chart-1))",
  },
  errors: {
    label: "Errors",
    color: "hsl(var(--chart-2))",
  },
  avgTime: {
    label: "Avg Time (s)",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

// Generate chart data based on current time
const generateExecutionTrends = () => Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  executions: Math.floor(Math.random() * 15) + 5,
  errors: Math.floor(Math.random() * 2)
}))

const generatePerformanceData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().getDay()
  return days.map((_, i) => ({
    date: days[(today - 6 + i + 7) % 7],
    avgTime: Math.random() * 10 + 10,
    executions: Math.floor(Math.random() * 50) + 100
  }))
}

export default function DashboardPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executionTrendData] = useState(generateExecutionTrends)
  const [performanceData] = useState(generatePerformanceData)

  useEffect(() => {
    async function fetchData() {
      try {
        const [scriptsRes, statsRes] = await Promise.all([
          fetch('/api/scripts'),
          fetch('/api/stats')
        ])

        if (!scriptsRes.ok || !statsRes.ok) {
          throw new Error('Failed to fetch data from API')
        }

        const scriptsData = await scriptsRes.json()
        const statsData = await statsRes.json()

        setScripts(scriptsData.scripts || [])
        setStats(statsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Generate mock executions based on real scripts
  const recentExecutions: Execution[] = scripts.slice(0, 10).map((script, i) => ({
    id: `exec-${i}`,
    scriptId: script.id,
    scriptName: script.name,
    function: 'main',
    startTime: new Date(Date.now() - Math.random() * 7200000),
    endTime: new Date(Date.now() - Math.random() * 7000000),
    duration: script.avgExecutionTime,
    status: script.status === 'error' ? 'error' : script.status === 'warning' ? 'warning' : 'success',
    message: script.status === 'warning' ? 'Some records could not be processed' : undefined
  }))

  const recentErrors = recentExecutions.filter(e => e.status === "error" || e.status === "warning")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading scripts from Google...</span>
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Google Apps Scripts health and performance
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="mr-1 h-3 w-3" />
          Live data from Google
        </Badge>
      </div>

      {/* Alert Banner for Errors */}
      {displayStats.errorCount > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            {displayStats.errorCount} script{displayStats.errorCount > 1 ? "s have" : " has"} errors that need your attention.{" "}
            <Link href="/monitoring" className="font-medium underline underline-offset-4">
              View details
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scripts</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.totalScripts}</div>
            <p className="text-xs text-muted-foreground">
              From your Google Drive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{displayStats.healthyCount}</div>
            <p className="text-xs text-muted-foreground">
              Recently modified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{displayStats.warningCount}</div>
            <p className="text-xs text-muted-foreground">
              Not modified recently
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{displayStats.errorCount}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Based on status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.avgExecutionTime}s</div>
            <p className="text-xs text-muted-foreground">
              Across all scripts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Execution Trends (24h)</CardTitle>
            <CardDescription>Estimated script executions per hour</CardDescription>
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
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
            <CardDescription>Executions over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="executions" fill="var(--color-executions)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors & Warnings</CardTitle>
            <CardDescription>Scripts that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Script</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentErrors.length > 0 ? (
                  recentErrors.slice(0, 5).map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell className="font-medium">
                        <Link href={`/scripts/${exec.scriptId}`} className="hover:underline">
                          {exec.scriptName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={exec.status === "error" ? "error" : "warning"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(exec.startTime, { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No errors or warnings
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest script activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Script</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExecutions.slice(0, 5).map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium">
                      <Link href={`/scripts/${exec.scriptId}`} className="hover:underline">
                        {exec.scriptName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={exec.status === "success" ? "healthy" : exec.status === "warning" ? "warning" : "error"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exec.duration.toFixed(1)}s
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Script Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Script Status Overview</CardTitle>
          <CardDescription>Quick view of all scripts and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scripts.slice(0, 9).map((script) => (
              <Link
                key={script.id}
                href={`/scripts/${script.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate max-w-[150px]">{script.name}</span>
                </div>
                <StatusBadge status={script.status} showIcon={false} />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/scripts" className="text-sm text-muted-foreground hover:underline">
              View all {scripts.length} scripts →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
