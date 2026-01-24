"use client"

import { useEffect, useState } from "react"
import {
  RefreshCw,
  Loader2,
  Code,
  Lightbulb,
  GitBranch,
  ExternalLink,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Zap,
  Search,
  Network
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FunctionInfo {
  name: string
  description: string
  parameters: string[]
  isPublic: boolean
  lineCount: number
}

interface ApiUsage {
  url: string
  method: string
  description: string
  count: number
}

interface TriggerInfo {
  type: string
  function: string
  schedule?: string
}

interface ScriptAnalysis {
  name: string
  scriptId: string
  summary: string
  complexity: 'low' | 'medium' | 'high'
  linesOfCode: number
  functionCount: number
  apiCount: number
  googleServices: string[]
  triggerCount: number
  suggestionCount: number
  lastAnalyzed: string
  functions?: FunctionInfo[]
  externalApis?: ApiUsage[]
  triggers?: TriggerInfo[]
  suggestions?: string[]
  dependencies?: string[]
}

interface AnalysisStats {
  totalScripts: number
  totalFunctions: number
  totalLinesOfCode: number
  totalExternalApis: number
  complexityDistribution: {
    low: number
    medium: number
    high: number
  }
  mostUsedServices: { name: string; count: number }[]
  commonSuggestions: { suggestion: string; count: number }[]
}

export default function AnalysisPage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [analyses, setAnalyses] = useState<ScriptAnalysis[]>([])
  const [selectedScript, setSelectedScript] = useState<ScriptAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  async function fetchAnalyses() {
    try {
      setLoading(true)
      const response = await fetch('/api/analysis')
      if (!response.ok) throw new Error('Failed to fetch analyses')
      const data = await response.json()
      setStats(data.stats)
      setAnalyses(data.analyses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchScriptDetail(name: string) {
    try {
      const response = await fetch(`/api/analysis?name=${encodeURIComponent(name)}`)
      if (!response.ok) throw new Error('Failed to fetch script details')
      const data = await response.json()
      setSelectedScript(data)
    } catch (err) {
      console.error('Failed to fetch script details:', err)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeAfterSync: true })
      })
      if (!response.ok) throw new Error('Sync failed')
      await fetchAnalyses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const filteredAnalyses = analyses.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.summary.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const complexityColor = (c: string) => {
    switch (c) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading script analyses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Script Analysis</h1>
          <p className="text-muted-foreground">
            Deep insights into your Google Apps Scripts
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing & Analyzing...' : 'Sync & Analyze All'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Code className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Analyses Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Click "Sync & Analyze All" to fetch your scripts from Google and analyze them.
            </p>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scripts Analyzed</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalScripts}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalFunctions} total functions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lines of Code</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalLinesOfCode.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all scripts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">External APIs</CardTitle>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExternalApis}</div>
                  <p className="text-xs text-muted-foreground">
                    Third-party integrations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Complexity</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="bg-green-50">
                      {stats.complexityDistribution.low} Low
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50">
                      {stats.complexityDistribution.medium} Med
                    </Badge>
                    <Badge variant="outline" className="bg-red-50">
                      {stats.complexityDistribution.high} High
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Script List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Scripts</CardTitle>
                  <CardDescription>Click to view details</CardDescription>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search scripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  <div className="space-y-2">
                    {filteredAnalyses.map((analysis) => (
                      <button
                        key={analysis.name}
                        onClick={() => fetchScriptDetail(analysis.name)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                          selectedScript?.name === analysis.name ? 'border-primary bg-muted/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{analysis.name}</span>
                          <Badge className={complexityColor(analysis.complexity)} variant="outline">
                            {analysis.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {analysis.summary}
                        </p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{analysis.linesOfCode} lines</span>
                          <span>•</span>
                          <span>{analysis.functionCount} functions</span>
                          {analysis.apiCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{analysis.apiCount} APIs</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Script Details */}
            <div className="lg:col-span-2">
              {selectedScript ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedScript.name}</CardTitle>
                        <CardDescription>{selectedScript.summary}</CardDescription>
                      </div>
                      <Badge className={complexityColor(selectedScript.complexity)}>
                        {selectedScript.complexity} complexity
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="functions">Functions</TabsTrigger>
                        <TabsTrigger value="apis">APIs</TabsTrigger>
                        <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-2xl font-bold">{selectedScript.linesOfCode}</div>
                            <div className="text-xs text-muted-foreground">Lines</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-2xl font-bold">{selectedScript.functions?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Functions</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-2xl font-bold">{selectedScript.externalApis?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">External APIs</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-2xl font-bold">{selectedScript.triggers?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Triggers</div>
                          </div>
                        </div>

                        {/* Google Services */}
                        <div>
                          <h4 className="font-medium mb-2">Google Services Used</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedScript.googleServices?.map((service) => (
                              <Badge key={service} variant="secondary">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Triggers */}
                        {selectedScript.triggers && selectedScript.triggers.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Triggers</h4>
                            <div className="space-y-2">
                              {selectedScript.triggers.map((trigger, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <Zap className="h-4 w-4 text-yellow-500" />
                                  <span className="font-mono">{trigger.function}()</span>
                                  <Badge variant="outline">{trigger.type}</Badge>
                                  {trigger.schedule && (
                                    <span className="text-muted-foreground">({trigger.schedule})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dependencies */}
                        {selectedScript.dependencies && selectedScript.dependencies.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Dependencies</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedScript.dependencies.map((dep, i) => (
                                <Badge key={i} variant="outline">
                                  <GitBranch className="h-3 w-3 mr-1" />
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="functions" className="mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Function</TableHead>
                              <TableHead>Parameters</TableHead>
                              <TableHead>Lines</TableHead>
                              <TableHead>Visibility</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedScript.functions?.map((func) => (
                              <TableRow key={func.name}>
                                <TableCell>
                                  <div>
                                    <span className="font-mono font-medium">{func.name}()</span>
                                    {func.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {func.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {func.parameters.length > 0 ? func.parameters.join(', ') : '-'}
                                </TableCell>
                                <TableCell>{func.lineCount}</TableCell>
                                <TableCell>
                                  <Badge variant={func.isPublic ? 'default' : 'secondary'}>
                                    {func.isPublic ? 'Public' : 'Private'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TabsContent>

                      <TabsContent value="apis" className="mt-4">
                        {selectedScript.externalApis && selectedScript.externalApis.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Endpoint</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Calls</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedScript.externalApis.map((api, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                                    {api.url}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{api.method}</Badge>
                                  </TableCell>
                                  <TableCell>{api.description}</TableCell>
                                  <TableCell>{api.count}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No external APIs detected</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="suggestions" className="mt-4">
                        {selectedScript.suggestions && selectedScript.suggestions.length > 0 ? (
                          <div className="space-y-3">
                            {selectedScript.suggestions.map((suggestion, i) => (
                              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                                <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm">{suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>No suggestions - code looks good!</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Network className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Script</h3>
                    <p className="text-muted-foreground text-center">
                      Click on a script from the list to view detailed analysis
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Common Suggestions & Services */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Most Used Google Services</CardTitle>
                  <CardDescription>Across all your scripts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.mostUsedServices.map((service) => (
                      <div key={service.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{service.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {service.count} scripts
                            </span>
                          </div>
                          <Progress
                            value={(service.count / stats.totalScripts) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Improvement Areas</CardTitle>
                  <CardDescription>Suggestions that apply to multiple scripts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.commonSuggestions.map((item) => (
                      <div key={item.suggestion} className="flex items-start gap-3">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{item.suggestion}</p>
                          <p className="text-xs text-muted-foreground">
                            Affects {item.count} scripts
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
