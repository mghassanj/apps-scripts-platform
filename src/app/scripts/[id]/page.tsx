"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  Loader2,
  FileSpreadsheet,
  Code,
  Activity,
  Workflow,
  Globe,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Database,
  Mail,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  GitBranch,
  Server,
  RefreshCw,
  Scale,
  ClipboardCheck,
  TrendingUp,
  Calculator,
  Binary,
  Repeat,
  BookOpen,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { StatusBadge } from "@/components/status-badge"
import { formatDistanceToNow, format } from "date-fns"
import { Script, ExecutionRecord, EnhancedApiUsage, DetailedAutomationAnalysis, BusinessLogicAnalysis } from "@/types"

// Extended script type with database fields
interface ExtendedScript extends Omit<Script, 'functions'> {
  functionalSummary?: string
  workflowSteps?: string[]
  complexity?: 'low' | 'medium' | 'high'
  linesOfCode?: number
  googleServices?: string[]
  apis?: EnhancedApiUsage[]
  executions?: ExecutionRecord[]
  files?: Array<{ id: string; name: string; type: string; content: string }>
  functions?: Array<{
    name: string
    description: string
    parameters: string[]
    isPublic: boolean
    lineCount: number
    fileName?: string
  }>
}

interface ScriptDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ScriptDetailPage({ params }: ScriptDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [script, setScript] = useState<ExtendedScript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string>('')
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAutomationAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  useEffect(() => {
    async function fetchScript() {
      try {
        const response = await fetch(`/api/scripts/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Script not found')
          } else {
            setError('Failed to load script')
          }
          return
        }
        const data = await response.json()
        setDataSource(data.source || 'unknown')

        // Parse dates from the API response
        const scriptData: ExtendedScript = {
          ...data.script,
          lastRun: data.script.lastRun ? new Date(data.script.lastRun) : null,
          nextRun: data.script.nextRun ? new Date(data.script.nextRun) : null,
          createdAt: new Date(data.script.createdAt),
          updatedAt: new Date(data.script.updatedAt),
          triggers: data.script.triggers.map((t: Record<string, unknown>) => ({
            ...t,
            lastFire: t.lastFire ? new Date(t.lastFire as string) : null,
            nextFire: t.nextFire ? new Date(t.nextFire as string) : null,
          })),
          executions: data.script.executions?.map((e: Record<string, unknown>) => ({
            ...e,
            startedAt: new Date(e.startedAt as string),
            endedAt: e.endedAt ? new Date(e.endedAt as string) : undefined,
          }))
        }
        setScript(scriptData)

        // Automatically fetch detailed analysis
        fetchDetailedAnalysis()
      } catch (err) {
        setError('Failed to load script')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    async function fetchDetailedAnalysis() {
      setLoadingAnalysis(true)
      try {
        const response = await fetch(`/api/scripts/${id}/detailed-analysis`)
        if (response.ok) {
          const data = await response.json()
          setDetailedAnalysis(data.analysis)
        }
      } catch (err) {
        console.error('Failed to fetch detailed analysis:', err)
      } finally {
        setLoadingAnalysis(false)
      }
    }

    fetchScript()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !script) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/scripts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">{error || 'Script not found'}</p>
              <p className="text-sm mt-2">The script you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
              <Button className="mt-4" onClick={() => router.push('/scripts')}>
                View All Scripts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const complexityColor = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const getDataFlowIcon = (type: string) => {
    switch (type) {
      case 'spreadsheet': return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      case 'api': return <Globe className="h-4 w-4 text-blue-600" />
      case 'email': return <Mail className="h-4 w-4 text-red-600" />
      case 'database': return <Database className="h-4 w-4 text-purple-600" />
      case 'cache': return <Server className="h-4 w-4 text-orange-600" />
      default: return <FileCode className="h-4 w-4 text-gray-600" />
    }
  }

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
            {dataSource === 'database' && (
              <Badge variant="outline" className="text-xs">From Database</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{script.name}</h1>
            <StatusBadge status={script.status} />
            {script.complexity && (
              <Badge className={complexityColor[script.complexity]}>
                {script.complexity} complexity
              </Badge>
            )}
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
            {script.linesOfCode && (
              <span className="flex items-center gap-1">
                <Code className="h-4 w-4" />
                {script.linesOfCode} lines
              </span>
            )}
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
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <Workflow className="h-4 w-4 mr-2" />
            Automation Details
          </TabsTrigger>
          <TabsTrigger value="operations">
            <Layers className="h-4 w-4 mr-2" />
            Operations
            {detailedAnalysis?.operations && (
              <Badge variant="secondary" className="ml-2">{detailedAnalysis.operations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="data-flow">
            <GitBranch className="h-4 w-4 mr-2" />
            Data Flow
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Globe className="h-4 w-4 mr-2" />
            Integrations
            {detailedAnalysis?.integrations && (
              <Badge variant="secondary" className="ml-2">{detailedAnalysis.integrations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="business-logic">
            <Scale className="h-4 w-4 mr-2" />
            Business Logic
            {detailedAnalysis?.businessLogic?.businessRules && (
              <Badge variant="secondary" className="ml-2">{detailedAnalysis.businessLogic.businessRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="functions">
            <Code className="h-4 w-4 mr-2" />
            Functions
            {script.functions && (
              <Badge variant="secondary" className="ml-2">{script.functions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="code">Source Code</TabsTrigger>
          <TabsTrigger value="logs">
            Execution Logs
            {script.executions && script.executions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{script.executions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Automation Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {loadingAnalysis ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing automation...</span>
                </div>
              </CardContent>
            </Card>
          ) : detailedAnalysis ? (
            <>
              {/* Purpose Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    What This Automation Does
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-medium">{detailedAnalysis.purpose}</p>
                  <p className="text-muted-foreground">{detailedAnalysis.detailedDescription}</p>
                </CardContent>
              </Card>

              {/* Trigger Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    How It&apos;s Triggered
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {detailedAnalysis.triggerExplanation.type}
                    </Badge>
                    {detailedAnalysis.triggerExplanation.schedule && (
                      <Badge variant="secondary">
                        {detailedAnalysis.triggerExplanation.schedule}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {detailedAnalysis.triggerExplanation.description}
                  </p>
                  {detailedAnalysis.triggerExplanation.events && detailedAnalysis.triggerExplanation.events.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Trigger Events:</h4>
                      <ul className="space-y-1">
                        {detailedAnalysis.triggerExplanation.events.map((event, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            {event}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Operations</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{detailedAnalysis.operations.length}</div>
                    <p className="text-xs text-muted-foreground">Step-by-step actions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Data Inputs</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{detailedAnalysis.dataFlow.inputs.length}</div>
                    <p className="text-xs text-muted-foreground">Data sources</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Integrations</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{detailedAnalysis.integrations.length}</div>
                    <p className="text-xs text-muted-foreground">External services</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Functions</CardTitle>
                    <Code className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{script.functions?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Code functions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings & Recommendations */}
              <div className="grid gap-4 md:grid-cols-2">
                {detailedAnalysis.warnings.length > 0 && (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-5 w-5" />
                        Warnings ({detailedAnalysis.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {detailedAnalysis.warnings.map((warning, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <XCircle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Lightbulb className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {detailedAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <p>Detailed analysis not available. Run a sync to generate analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Step-by-Step Operations
              </CardTitle>
              <CardDescription>
                Every operation that happens when this automation runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailedAnalysis?.operations && detailedAnalysis.operations.length > 0 ? (
                <div className="relative">
                  {/* Vertical line connecting steps */}
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />

                  <div className="space-y-6">
                    {detailedAnalysis.operations.map((op, i) => (
                      <div key={i} className="relative flex gap-4">
                        {/* Step number circle */}
                        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                          {op.step}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 pt-1">
                          <Card>
                            <CardContent className="pt-4">
                              <h4 className="font-semibold text-lg mb-2">{op.name}</h4>
                              <p className="text-muted-foreground mb-3">{op.description}</p>

                              {op.functionName && (
                                <div className="mb-2">
                                  <Badge variant="outline">
                                    <Code className="h-3 w-3 mr-1" />
                                    {op.functionName}()
                                  </Badge>
                                </div>
                              )}

                              <div className="grid gap-3 md:grid-cols-2 text-sm">
                                {op.inputs && op.inputs.length > 0 && (
                                  <div>
                                    <span className="font-medium text-green-600 dark:text-green-400">Inputs:</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {op.inputs.map((input, j) => (
                                        <li key={j} className="flex items-center gap-1 text-muted-foreground">
                                          <ArrowRight className="h-3 w-3" />
                                          {input}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {op.outputs && op.outputs.length > 0 && (
                                  <div>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">Outputs:</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {op.outputs.map((output, j) => (
                                        <li key={j} className="flex items-center gap-1 text-muted-foreground">
                                          <ArrowRight className="h-3 w-3" />
                                          {output}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No operations analysis available. Sync script to generate.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Flow Tab */}
        <TabsContent value="data-flow" className="space-y-4">
          {detailedAnalysis?.dataFlow ? (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Inputs */}
              <Card>
                <CardHeader className="bg-green-50 dark:bg-green-950 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Database className="h-5 w-5" />
                    Data Inputs
                  </CardTitle>
                  <CardDescription>Where data comes from</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {detailedAnalysis.dataFlow.inputs.length > 0 ? (
                    <div className="space-y-3">
                      {detailedAnalysis.dataFlow.inputs.map((input, i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {getDataFlowIcon(input.type)}
                            <span className="font-medium">{input.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{input.description}</p>
                          {input.details && (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded mt-2 block truncate">
                              {input.details}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No external data inputs</p>
                  )}
                </CardContent>
              </Card>

              {/* Processing */}
              <Card>
                <CardHeader className="bg-purple-50 dark:bg-purple-950 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <RefreshCw className="h-5 w-5" />
                    Processing
                  </CardTitle>
                  <CardDescription>How data is transformed</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {detailedAnalysis.dataFlow.processing.length > 0 ? (
                    <div className="space-y-3">
                      {detailedAnalysis.dataFlow.processing.map((proc, i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{proc.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{proc.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Direct data pass-through</p>
                  )}
                </CardContent>
              </Card>

              {/* Outputs */}
              <Card>
                <CardHeader className="bg-blue-50 dark:bg-blue-950 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <ArrowRight className="h-5 w-5" />
                    Data Outputs
                  </CardTitle>
                  <CardDescription>Where results go</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {detailedAnalysis.dataFlow.outputs.length > 0 ? (
                    <div className="space-y-3">
                      {detailedAnalysis.dataFlow.outputs.map((output, i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {getDataFlowIcon(output.type)}
                            <span className="font-medium">{output.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{output.description}</p>
                          {output.details && (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded mt-2 block truncate">
                              {output.details}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No external data outputs</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  Data flow analysis not available. Sync script to generate.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                External Integrations
              </CardTitle>
              <CardDescription>
                Services and APIs this automation connects to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailedAnalysis?.integrations && detailedAnalysis.integrations.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {detailedAnalysis.integrations.map((integration, i) => (
                    <AccordionItem key={i} value={`integration-${i}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          {integration.type === 'google-service' ? (
                            <Badge variant="secondary">{integration.name}</Badge>
                          ) : (
                            <Badge variant="outline">{integration.name}</Badge>
                          )}
                          <span className="text-sm text-muted-foreground capitalize">
                            {integration.type.replace('-', ' ')}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-muted-foreground">{integration.description}</p>

                          {integration.operations && integration.operations.length > 0 && (
                            <div>
                              <span className="font-medium text-sm">Operations:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {integration.operations.map((op, j) => (
                                  <Badge key={j} variant="outline" className="text-xs">
                                    {op}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {integration.endpoints && integration.endpoints.length > 0 && (
                            <div>
                              <span className="font-medium text-sm">Endpoints:</span>
                              <ul className="mt-1 space-y-1">
                                {integration.endpoints.map((endpoint, j) => (
                                  <li key={j}>
                                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                      {endpoint}
                                    </code>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {integration.authentication && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">Auth:</span>
                              <span className="text-sm text-muted-foreground">
                                {integration.authentication}
                              </span>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No integrations detected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Connected Files */}
          {script.connectedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Connected Files ({script.connectedFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {script.connectedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <div>
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline text-primary flex items-center gap-1"
                            >
                              {file.name || file.fileId}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-medium">{file.name || file.fileId}</span>
                          )}
                          {file.codeLocation && (
                            <p className="text-xs text-muted-foreground">
                              Found in {file.codeLocation}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">{file.accessType}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Business Logic Tab */}
        <TabsContent value="business-logic" className="space-y-6">
          {loadingAnalysis ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Extracting business logic...</span>
                </div>
              </CardContent>
            </Card>
          ) : detailedAnalysis?.businessLogic ? (
            <>
              {/* Business Requirements */}
              {detailedAnalysis.businessLogic.businessRequirements && detailedAnalysis.businessLogic.businessRequirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      Business Requirements
                    </CardTitle>
                    <CardDescription>
                      High-level business needs this automation addresses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedAnalysis.businessLogic.businessRequirements.map((req, i) => (
                        <div key={req.id || i} className="p-4 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className="capitalize mt-0.5">
                              {req.category}
                            </Badge>
                            <div className="flex-1">
                              <h4 className="font-semibold">{req.title}</h4>
                              <p className="text-muted-foreground mt-1">{req.description}</p>
                              {req.relatedFunctions && req.relatedFunctions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {req.relatedFunctions.map((fn, j) => (
                                    <code key={j} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                      {fn}()
                                    </code>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Business Rules */}
              {detailedAnalysis.businessLogic.businessRules && detailedAnalysis.businessLogic.businessRules.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-purple-500" />
                      Business Rules ({detailedAnalysis.businessLogic.businessRules.length})
                    </CardTitle>
                    <CardDescription>
                      Specific conditions and actions that govern the automation&apos;s behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {detailedAnalysis.businessLogic.businessRules.map((rule, i) => (
                        <AccordionItem key={rule.id || i} value={`rule-${i}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-3 text-left">
                              <Badge
                                variant={
                                  rule.severity === 'critical' ? 'destructive' :
                                  rule.severity === 'important' ? 'default' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {rule.severity}
                              </Badge>
                              <span>{rule.name}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <p className="text-muted-foreground">{rule.description}</p>

                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2 text-yellow-700 dark:text-yellow-300">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="font-medium text-sm">IF (Condition)</span>
                                  </div>
                                  <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
                                    {rule.condition}
                                  </code>
                                  <p className="text-sm text-muted-foreground">{rule.conditionExplained}</p>
                                </div>

                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="font-medium text-sm">THEN (Action)</span>
                                  </div>
                                  <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">
                                    {rule.action}
                                  </code>
                                  <p className="text-sm text-muted-foreground">{rule.actionExplained}</p>
                                </div>
                              </div>

                              {rule.codeLocation && (
                                <p className="text-xs text-muted-foreground">
                                  Location: <code>{rule.codeLocation}</code>
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}

              {/* Validations */}
              {detailedAnalysis.businessLogic.validations && detailedAnalysis.businessLogic.validations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-orange-500" />
                      Validations ({detailedAnalysis.businessLogic.validations.length})
                    </CardTitle>
                    <CardDescription>
                      Data checks and validations performed by this automation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedAnalysis.businessLogic.validations.map((val, i) => (
                        <div key={val.id || i} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{val.field}</h4>
                              <p className="text-sm text-muted-foreground">{val.fieldDescription}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">Validation Check:</p>
                              <code className="text-xs">{val.condition}</code>
                              <p className="text-sm text-muted-foreground mt-1">{val.conditionExplained}</p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  If Valid
                                </p>
                                <p className="text-sm">{val.onPass}</p>
                              </div>
                              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  If Invalid
                                </p>
                                <p className="text-sm">{val.onFail}</p>
                                {val.errorMessage && (
                                  <code className="text-xs text-red-600 mt-1 block">
                                    &quot;{val.errorMessage}&quot;
                                  </code>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Flows */}
              {detailedAnalysis.businessLogic.statusFlows && detailedAnalysis.businessLogic.statusFlows.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      Status Flows ({detailedAnalysis.businessLogic.statusFlows.length})
                    </CardTitle>
                    <CardDescription>
                      Status values and how they transition
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {detailedAnalysis.businessLogic.statusFlows.map((flow, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Badge variant="outline">{flow.statusField}</Badge>
                            Status Field
                          </h4>

                          {/* Possible Values */}
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-2">Possible Values:</p>
                            <div className="flex flex-wrap gap-2">
                              {flow.possibleValues.map((val, j) => (
                                <div
                                  key={j}
                                  className={`px-3 py-1.5 rounded-lg text-sm ${
                                    val.isTerminal
                                      ? 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                                      : 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                                  }`}
                                >
                                  <span className="font-mono font-medium">{val.value}</span>
                                  <span className="text-muted-foreground ml-2">- {val.meaning}</span>
                                  {val.isTerminal && (
                                    <Badge variant="secondary" className="ml-2 text-xs">Final</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Transitions */}
                          {flow.transitions && flow.transitions.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Transitions:</p>
                              <div className="space-y-2">
                                {flow.transitions.map((trans, j) => (
                                  <div key={j} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                    <Badge variant="outline">
                                      {Array.isArray(trans.from) ? trans.from.join(' | ') : trans.from}
                                    </Badge>
                                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="default">{trans.to}</Badge>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      when: {trans.conditionExplained}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Calculations */}
              {detailedAnalysis.businessLogic.calculations && detailedAnalysis.businessLogic.calculations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-cyan-500" />
                      Business Calculations ({detailedAnalysis.businessLogic.calculations.length})
                    </CardTitle>
                    <CardDescription>
                      Formulas and calculations performed by this automation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedAnalysis.businessLogic.calculations.map((calc, i) => (
                        <div key={calc.id || i} className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">{calc.name}</h4>
                          <p className="text-muted-foreground mb-3">{calc.description}</p>

                          <div className="p-3 bg-muted rounded-lg mb-3">
                            <p className="text-sm font-medium mb-1">Formula:</p>
                            <code className="text-sm font-mono">{calc.formula}</code>
                            <p className="text-sm text-muted-foreground mt-2">{calc.formulaExplained}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3 text-sm">
                            <div>
                              <span className="font-medium text-green-600 dark:text-green-400">Inputs:</span>
                              <ul className="mt-1 space-y-0.5">
                                {calc.inputs.map((input, j) => (
                                  <li key={j} className="flex items-center gap-1 text-muted-foreground">
                                    <ArrowRight className="h-3 w-3" />
                                    {input}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium text-blue-600 dark:text-blue-400">Output:</span>
                              <p className="mt-1 text-muted-foreground">{calc.output}</p>
                            </div>
                            {calc.example && (
                              <div>
                                <span className="font-medium text-purple-600 dark:text-purple-400">Example:</span>
                                <p className="mt-1 text-muted-foreground">{calc.example}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decision Tree */}
              {detailedAnalysis.businessLogic.decisionTree && detailedAnalysis.businessLogic.decisionTree.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Binary className="h-5 w-5 text-emerald-500" />
                      Decision Logic ({detailedAnalysis.businessLogic.decisionTree.length})
                    </CardTitle>
                    <CardDescription>
                      Conditional logic and decision points in the automation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedAnalysis.businessLogic.decisionTree.map((node, i) => (
                        <div key={node.id || i} className="p-4 border rounded-lg">
                          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg mb-4">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Condition
                            </p>
                            <code className="text-sm">{node.condition}</code>
                            <p className="text-sm text-muted-foreground mt-1">{node.conditionExplained}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {/* If True Branch */}
                            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                If TRUE
                              </p>
                              <p className="text-sm mb-2">{node.ifTrue.actionExplained}</p>
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">{node.ifTrue.action}</code>
                              {node.ifTrue.setsStatus && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Sets status to: <Badge variant="outline" className="text-xs">{node.ifTrue.setsStatus}</Badge>
                                </p>
                              )}
                              {node.ifTrue.sendsNotification && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  Sends notification: {node.ifTrue.notificationDetails}
                                </p>
                              )}
                            </div>

                            {/* If False Branch */}
                            {node.ifFalse && (
                              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" />
                                  If FALSE
                                </p>
                                <p className="text-sm mb-2">{node.ifFalse.actionExplained}</p>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">{node.ifFalse.action}</code>
                                {node.ifFalse.setsStatus && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Sets status to: <Badge variant="outline" className="text-xs">{node.ifFalse.setsStatus}</Badge>
                                  </p>
                                )}
                                {node.ifFalse.sendsNotification && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Sends notification: {node.ifFalse.notificationDetails}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {node.codeLocation && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Location: <code>{node.codeLocation}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Transformations */}
              {detailedAnalysis.businessLogic.dataTransformations && detailedAnalysis.businessLogic.dataTransformations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5 text-pink-500" />
                      Data Transformations ({detailedAnalysis.businessLogic.dataTransformations.length})
                    </CardTitle>
                    <CardDescription>
                      How data is transformed and processed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedAnalysis.businessLogic.dataTransformations.map((trans, i) => (
                        <div key={trans.id || i} className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">{trans.name}</h4>
                          <p className="text-muted-foreground mb-3">{trans.description}</p>

                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                              <span className="font-medium">Input: </span>
                              <span className="text-muted-foreground">{trans.inputFormat}</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                              <span className="font-medium">Output: </span>
                              <span className="text-muted-foreground">{trans.outputFormat}</span>
                            </div>
                          </div>

                          <p className="text-sm">
                            <span className="font-medium">Business Purpose: </span>
                            <span className="text-muted-foreground">{trans.businessPurpose}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No business logic found message */}
              {(!detailedAnalysis.businessLogic.businessRules || detailedAnalysis.businessLogic.businessRules.length === 0) &&
               (!detailedAnalysis.businessLogic.validations || detailedAnalysis.businessLogic.validations.length === 0) &&
               (!detailedAnalysis.businessLogic.calculations || detailedAnalysis.businessLogic.calculations.length === 0) &&
               (!detailedAnalysis.businessLogic.decisionTree || detailedAnalysis.businessLogic.decisionTree.length === 0) && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No detailed business logic was extracted from this script.</p>
                      <p className="text-sm mt-2">This could mean the script has simple logic or uses patterns not yet recognized.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <p>Business logic analysis not available. Run a sync to generate analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Functions Tab */}
        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Functions ({script.functions?.length || 0})
              </CardTitle>
              <CardDescription>
                All functions defined in this automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailedAnalysis?.functionBreakdown && detailedAnalysis.functionBreakdown.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {detailedAnalysis.functionBreakdown.map((func, i) => (
                    <AccordionItem key={i} value={`func-${i}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <code className="font-mono">{func.name}()</code>
                          {func.isEntryPoint && (
                            <Badge variant="default" className="text-xs">Entry Point</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="font-medium">{func.purpose}</p>

                          {func.whatItDoes.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">What it does:</span>
                              <ul className="mt-1 space-y-1">
                                {func.whatItDoes.map((action, j) => (
                                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {func.parameters.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">Parameters:</span>
                              <ul className="mt-1 space-y-1">
                                {func.parameters.map((param, j) => (
                                  <li key={j} className="text-sm">
                                    <code className="bg-muted px-1 rounded">{param.name}</code>
                                    <span className="text-muted-foreground ml-2">- {param.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {func.returns && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">Returns:</span>
                              <span className="text-muted-foreground">{func.returns}</span>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : script.functions && script.functions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Function</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Visibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {script.functions.map((func, idx) => (
                      <TableRow key={`${func.name}-${idx}`}>
                        <TableCell>
                          <code className="text-sm">{func.name}()</code>
                          {func.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {func.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {func.fileName || '-'}
                        </TableCell>
                        <TableCell>{func.lineCount || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={func.isPublic ? 'default' : 'secondary'}>
                            {func.isPublic ? 'Public' : 'Private'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No functions found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Code Files</CardTitle>
              <CardDescription>Script files and their content</CardDescription>
            </CardHeader>
            <CardContent>
              {script.files && script.files.length > 0 ? (
                <div className="space-y-4">
                  {script.files.map((file) => (
                    <div key={file.id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          <span className="font-mono text-sm">{file.name}</span>
                        </div>
                        <Badge variant="outline">{file.type}</Badge>
                      </div>
                      <pre className="p-4 overflow-x-auto text-xs bg-muted/20 max-h-[400px] overflow-y-auto">
                        <code>{file.content}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No source code available. Run a sync to fetch script content.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Execution History
                </CardTitle>
                <CardDescription>Recent executions of this script</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://script.google.com/home/projects/${script.id}/executions`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Apps Script
                </a>
              </Button>
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
                  {script.executions && script.executions.length > 0 ? (
                    script.executions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell>
                          {format(exec.startedAt, "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{exec.functionName}()</code>
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
                        <TableCell>{exec.duration?.toFixed(1) || '-'}s</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {exec.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="space-y-2">
                          <p className="text-muted-foreground">No execution history available.</p>
                          <p className="text-sm text-muted-foreground">
                            View execution logs in the{" "}
                            <a
                              href={`https://script.google.com/home/projects/${script.id}/executions`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Apps Script Editor
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
