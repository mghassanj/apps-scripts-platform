// Script Types
export type ScriptStatus = "healthy" | "warning" | "error" | "inactive"
export type ScriptType = "time-driven" | "on-edit" | "on-open" | "on-form-submit" | "manual"
export type TriggerType = "time-driven" | "on-edit" | "on-open" | "on-form-submit"
export type FileType = "spreadsheet" | "document" | "standalone" | "drive"

export interface Script {
  id: string
  name: string
  description: string
  parentFile: {
    id: string
    name: string
    type: FileType
    url: string
  }
  status: ScriptStatus
  type: ScriptType
  triggers: Trigger[]
  externalAPIs: string[]
  sharedLibraries: string[]
  connectedFiles: ConnectedFile[]
  lastRun: Date | null
  nextRun: Date | null
  avgExecutionTime: number
  owner: string
  createdAt: Date
  updatedAt: Date

  // Enhanced fields from database
  functionalSummary?: string
  workflowSteps?: string[]
  complexity?: 'low' | 'medium' | 'high'
  linesOfCode?: number
  googleServices?: string[]
  functions?: FunctionInfo[]
  apis?: EnhancedApiUsage[]
  executions?: ExecutionRecord[]
}

export interface Trigger {
  id: string
  type: TriggerType | string
  function: string
  schedule?: string
  scheduleDescription?: string
  sourceEvent?: string
  isProgrammatic?: boolean
  lastFire: Date | null
  nextFire: Date | null
  status: "enabled" | "disabled"
}

export interface Execution {
  id: string
  scriptId: string
  scriptName: string
  function: string
  startTime: Date
  endTime: Date
  duration: number
  status: "success" | "warning" | "error"
  message?: string
  stackTrace?: string
}

export interface ExecutionRecord {
  id: string
  functionName: string
  startedAt: Date
  endedAt?: Date
  duration?: number
  status: string
  errorMessage?: string
}

export interface Backup {
  id: string
  date: Date
  scriptsCount: number
  size: number
  status: "complete" | "partial" | "failed"
  path: string
}

export interface ConnectedFile {
  id: string
  name: string
  type: FileType
  url: string
  accessType: "read" | "write" | "read-write"
  fileId?: string
  extractedFrom?: string
  codeLocation?: string
}

export interface DashboardStats {
  totalScripts: number
  healthyCount: number
  warningCount: number
  errorCount: number
  executionsToday: number
  successRate: number
  avgExecutionTime: number
}

export interface AlertConfig {
  id: string
  type: "error" | "warning" | "info"
  condition: string
  action: "email" | "slack" | "log"
  enabled: boolean
}

export interface NotificationSettings {
  emailEnabled: boolean
  emailAddress: string
  alertOnError: boolean
  alertOnWarning: boolean
  dailySummary: boolean
  summaryTime: string
}

// Script Analysis Types
export interface ScriptFile {
  name: string
  type: string
  source: string
  lastModified: string
}

export interface ScriptProject {
  scriptId: string
  name: string
  parentId: string
  parentName: string
  parentType?: string
  files: ScriptFile[]
  lastSynced: string
}

export interface ScriptAnalysis {
  scriptId: string
  name: string
  summary: string
  functionalSummary?: FunctionalSummary
  functions: FunctionInfo[]
  externalApis: ApiUsage[]
  googleServices: string[]
  triggers: AnalysisTrigger[]
  connectedSpreadsheets: ExtractedConnectedFile[]
  dependencies: string[]
  suggestions: string[]
  complexity: 'low' | 'medium' | 'high'
  linesOfCode: number
  lastAnalyzed: string
}

export interface FunctionInfo {
  name: string
  description: string
  parameters: string[]
  isPublic: boolean
  lineCount: number
  fileName?: string
}

export interface ApiUsage {
  url: string
  method: string
  description: string
  count: number
  codeLocation?: string
}

export interface EnhancedApiUsage {
  id: string
  url: string
  baseUrl: string
  method: string
  description: string
  usageCount: number
  codeLocation?: string
}

export interface AnalysisTrigger {
  type: string
  function: string
  schedule?: string
  scheduleDescription?: string
  sourceEvent?: string
  isProgrammatic?: boolean
}

// New types for enhanced analysis
export interface ExtractedConnectedFile {
  fileId: string
  fileName?: string
  fileType: 'spreadsheet' | 'document' | 'drive'
  fileUrl?: string
  accessType: 'read' | 'write' | 'read-write'
  extractedFrom: 'openById' | 'openByUrl' | 'getFileById' | 'active' | 'openByName'
  codeLocation?: string
}

export interface FunctionalSummary {
  brief: string
  detailed: string
  workflowSteps: string[]
  inputSources: string[]
  outputTargets: string[]
}

export interface AnalysisStats {
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

export interface SyncStatus {
  lastSync: string
  synced: number
  failed: number
  projects?: { name: string; scriptId: string }[]
}

// Database script type (from Prisma)
export interface DbScript {
  id: string
  name: string
  description?: string | null
  parentFileId?: string | null
  parentFileName?: string | null
  parentFileType?: string | null
  owner?: string | null
  createdAt: Date
  updatedAt: Date
  lastSyncedAt?: Date | null
  lastAnalyzedAt?: Date | null
  functionalSummary?: string | null
  workflowSteps?: string | null
  complexity?: string | null
  linesOfCode?: number | null
  files?: DbScriptFile[]
  apis?: DbExternalApi[]
  triggers?: DbTrigger[]
  connectedFiles?: DbConnectedFile[]
  executions?: DbExecution[]
  functions?: DbScriptFunction[]
  googleServices?: DbGoogleService[]
}

export interface DbScriptFile {
  id: string
  scriptId: string
  name: string
  type: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface DbExternalApi {
  id: string
  scriptId: string
  url: string
  baseUrl: string
  method: string
  description: string
  usageCount: number
  codeLocation?: string | null
}

export interface DbTrigger {
  id: string
  scriptId: string
  type: string
  functionName: string
  schedule?: string | null
  scheduleDescription?: string | null
  sourceEvent?: string | null
  isProgrammatic: boolean
  lastFiredAt?: Date | null
  nextFireAt?: Date | null
  status: string
}

export interface DbConnectedFile {
  id: string
  scriptId: string
  fileId: string
  fileName?: string | null
  fileType: string
  fileUrl?: string | null
  accessType: string
  extractedFrom: string
  codeLocation?: string | null
}

export interface DbExecution {
  id: string
  scriptId: string
  functionName: string
  startedAt: Date
  endedAt?: Date | null
  duration?: number | null
  status: string
  errorMessage?: string | null
  createdAt: Date
}

export interface DbScriptFunction {
  id: string
  scriptId: string
  name: string
  description?: string | null
  parameters?: string | null
  isPublic: boolean
  lineCount?: number | null
  fileName?: string | null
}

export interface DbGoogleService {
  id: string
  scriptId: string
  serviceName: string
}

// Detailed automation analysis types
export interface DetailedAutomationAnalysis {
  // Overview
  purpose: string
  detailedDescription: string

  // Trigger explanation
  triggerExplanation: {
    type: string
    description: string
    schedule?: string
    events?: string[]
  }

  // Data flow
  dataFlow: {
    inputs: DataFlowItem[]
    processing: DataFlowItem[]
    outputs: DataFlowItem[]
  }

  // Operations breakdown
  operations: OperationDetail[]

  // Function explanations
  functionBreakdown: FunctionExplanation[]

  // Integration details
  integrations: IntegrationDetail[]

  // Business logic extracted from code
  businessLogic: BusinessLogicAnalysis

  // Potential issues or warnings
  warnings: string[]

  // Recommendations
  recommendations: string[]
}

// Business logic types - extracted from actual code analysis
export interface BusinessLogicAnalysis {
  // High-level business requirements this script addresses
  businessRequirements: BusinessRequirement[]

  // Specific business rules extracted from code
  businessRules: BusinessRule[]

  // Validation checks with conditions
  validations: ValidationCheck[]

  // Status values and when they're applied
  statusFlows: StatusFlow[]

  // Business calculations found in code
  calculations: BusinessCalculation[]

  // Decision tree / if-then logic
  decisionTree: DecisionNode[]

  // Data transformations with business meaning
  dataTransformations: DataTransformation[]
}

export interface BusinessRequirement {
  id: string
  title: string
  description: string
  category: 'validation' | 'calculation' | 'notification' | 'integration' | 'reporting' | 'workflow'
  relatedFunctions: string[]
}

export interface BusinessRule {
  id: string
  name: string
  description: string
  condition: string
  conditionExplained: string
  action: string
  actionExplained: string
  codeLocation?: string
  severity: 'critical' | 'important' | 'standard'
}

export interface ValidationCheck {
  id: string
  field: string
  fieldDescription: string
  condition: string
  conditionExplained: string
  errorMessage?: string
  onPass: string
  onFail: string
  codeLocation?: string
}

export interface StatusFlow {
  statusField: string
  possibleValues: StatusValue[]
  transitions: StatusTransition[]
}

export interface StatusValue {
  value: string
  meaning: string
  isTerminal: boolean
  triggers?: string[]
}

export interface StatusTransition {
  from: string | string[]
  to: string
  condition: string
  conditionExplained: string
  action?: string
}

export interface BusinessCalculation {
  id: string
  name: string
  description: string
  formula: string
  formulaExplained: string
  inputs: string[]
  output: string
  example?: string
  codeLocation?: string
}

export interface DecisionNode {
  id: string
  condition: string
  conditionExplained: string
  ifTrue: DecisionOutcome
  ifFalse?: DecisionOutcome
  nestedConditions?: DecisionNode[]
  codeLocation?: string
}

export interface DecisionOutcome {
  action: string
  actionExplained: string
  setsStatus?: string
  sendsNotification?: boolean
  notificationDetails?: string
  updatesData?: string[]
}

export interface DataTransformation {
  id: string
  name: string
  description: string
  inputFormat: string
  outputFormat: string
  businessPurpose: string
  codeLocation?: string
}

export interface DataFlowItem {
  name: string
  description: string
  type: 'spreadsheet' | 'api' | 'email' | 'file' | 'database' | 'cache' | 'user-input'
  details?: string
}

export interface OperationDetail {
  step: number
  name: string
  description: string
  functionName?: string
  codeSnippet?: string
  inputs?: string[]
  outputs?: string[]
  dependencies?: string[]
}

export interface FunctionExplanation {
  name: string
  purpose: string
  whatItDoes: string[]
  parameters: { name: string; description: string }[]
  returns?: string
  calls?: string[]
  calledBy?: string[]
  isEntryPoint: boolean
}

export interface IntegrationDetail {
  name: string
  type: 'api' | 'google-service' | 'database' | 'file-system'
  description: string
  endpoints?: string[]
  operations?: string[]
  authentication?: string
}
