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
}

export interface Trigger {
  id: string
  type: TriggerType
  function: string
  schedule?: string
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
