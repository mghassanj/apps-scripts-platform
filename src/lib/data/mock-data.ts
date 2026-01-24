import { Script, Execution, Backup, DashboardStats } from "@/types"

// Helper to create dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)

export const mockScripts: Script[] = [
  {
    id: "script-1",
    name: "Daily Sales Report",
    description: "Generates daily sales reports and sends to stakeholders",
    parentFile: {
      id: "sheet-1",
      name: "Sales Dashboard",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/abc123"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-1",
        type: "time-driven",
        function: "generateDailyReport",
        schedule: "0 6 * * *",
        lastFire: hoursAgo(2),
        nextFire: hoursFromNow(22),
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API", "SendGrid"],
    sharedLibraries: ["CommonUtils"],
    connectedFiles: [
      { id: "sheet-2", name: "Sales Data", type: "spreadsheet", url: "#", accessType: "read" }
    ],
    lastRun: hoursAgo(2),
    nextRun: hoursFromNow(22),
    avgExecutionTime: 12.5,
    owner: "john@company.com",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(3)
  },
  {
    id: "script-2",
    name: "Slack Notification Sync",
    description: "Syncs spreadsheet changes to Slack channels",
    parentFile: {
      id: "sheet-3",
      name: "Team Updates",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/def456"
    },
    status: "warning",
    type: "on-edit",
    triggers: [
      {
        id: "trigger-2",
        type: "on-edit",
        function: "onEditHandler",
        lastFire: hoursAgo(1),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API"],
    sharedLibraries: ["CommonUtils", "SlackLib"],
    connectedFiles: [],
    lastRun: hoursAgo(1),
    nextRun: null,
    avgExecutionTime: 3.2,
    owner: "sarah@company.com",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(7)
  },
  {
    id: "script-3",
    name: "Data Import Pipeline",
    description: "Imports data from external API into master spreadsheet",
    parentFile: {
      id: "sheet-4",
      name: "Master Data",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/ghi789"
    },
    status: "error",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-3",
        type: "time-driven",
        function: "importData",
        schedule: "0 */4 * * *",
        lastFire: hoursAgo(4),
        nextFire: hoursFromNow(0),
        status: "enabled"
      }
    ],
    externalAPIs: ["Salesforce API", "HubSpot API"],
    sharedLibraries: ["CommonUtils", "APIHelpers"],
    connectedFiles: [
      { id: "sheet-5", name: "Staging Data", type: "spreadsheet", url: "#", accessType: "write" }
    ],
    lastRun: hoursAgo(4),
    nextRun: hoursFromNow(0),
    avgExecutionTime: 45.8,
    owner: "mike@company.com",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1)
  },
  {
    id: "script-4",
    name: "Email Digest Sender",
    description: "Sends weekly email digests to subscribers",
    parentFile: {
      id: "sheet-6",
      name: "Newsletter Subscribers",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/jkl012"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-4",
        type: "time-driven",
        function: "sendWeeklyDigest",
        schedule: "0 9 * * 1",
        lastFire: daysAgo(3),
        nextFire: daysAgo(-4),
        status: "enabled"
      }
    ],
    externalAPIs: ["SendGrid", "Mailchimp API"],
    sharedLibraries: ["CommonUtils", "EmailTemplates"],
    connectedFiles: [
      { id: "doc-1", name: "Email Template", type: "document", url: "#", accessType: "read" }
    ],
    lastRun: daysAgo(3),
    nextRun: daysAgo(-4),
    avgExecutionTime: 28.3,
    owner: "lisa@company.com",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(14)
  },
  {
    id: "script-5",
    name: "Inventory Tracker",
    description: "Tracks inventory levels and sends low stock alerts",
    parentFile: {
      id: "sheet-7",
      name: "Inventory Management",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/mno345"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-5",
        type: "time-driven",
        function: "checkInventory",
        schedule: "0 8 * * *",
        lastFire: hoursAgo(6),
        nextFire: hoursFromNow(18),
        status: "enabled"
      }
    ],
    externalAPIs: ["Shopify API"],
    sharedLibraries: ["CommonUtils"],
    connectedFiles: [],
    lastRun: hoursAgo(6),
    nextRun: hoursFromNow(18),
    avgExecutionTime: 8.7,
    owner: "david@company.com",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5)
  },
  {
    id: "script-6",
    name: "Form Response Handler",
    description: "Processes Google Form responses and routes them",
    parentFile: {
      id: "sheet-8",
      name: "Contact Form Responses",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/pqr678"
    },
    status: "healthy",
    type: "on-form-submit",
    triggers: [
      {
        id: "trigger-6",
        type: "on-form-submit",
        function: "processFormResponse",
        lastFire: hoursAgo(0.5),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API", "Zendesk API"],
    sharedLibraries: ["CommonUtils", "FormHelpers"],
    connectedFiles: [
      { id: "sheet-9", name: "CRM Master", type: "spreadsheet", url: "#", accessType: "write" }
    ],
    lastRun: hoursAgo(0.5),
    nextRun: null,
    avgExecutionTime: 2.1,
    owner: "emma@company.com",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2)
  },
  {
    id: "script-7",
    name: "Calendar Sync",
    description: "Syncs team calendar events to shared spreadsheet",
    parentFile: {
      id: "sheet-10",
      name: "Team Calendar Overview",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/stu901"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-7",
        type: "time-driven",
        function: "syncCalendar",
        schedule: "0 * * * *",
        lastFire: hoursAgo(0.5),
        nextFire: hoursFromNow(0.5),
        status: "enabled"
      }
    ],
    externalAPIs: [],
    sharedLibraries: ["CommonUtils", "CalendarHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(0.5),
    nextRun: hoursFromNow(0.5),
    avgExecutionTime: 5.4,
    owner: "alex@company.com",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(10)
  },
  {
    id: "script-8",
    name: "Budget Calculator",
    description: "Calculates monthly budget allocations",
    parentFile: {
      id: "sheet-11",
      name: "Finance Dashboard",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/vwx234"
    },
    status: "inactive",
    type: "manual",
    triggers: [],
    externalAPIs: [],
    sharedLibraries: ["CommonUtils", "FinanceLib"],
    connectedFiles: [
      { id: "sheet-12", name: "Expense Tracker", type: "spreadsheet", url: "#", accessType: "read" },
      { id: "sheet-13", name: "Revenue Data", type: "spreadsheet", url: "#", accessType: "read" }
    ],
    lastRun: daysAgo(30),
    nextRun: null,
    avgExecutionTime: 15.2,
    owner: "cfo@company.com",
    createdAt: daysAgo(200),
    updatedAt: daysAgo(30)
  },
  {
    id: "script-9",
    name: "Report Generator",
    description: "Generates custom PDF reports from spreadsheet data",
    parentFile: {
      id: "sheet-14",
      name: "Report Templates",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/yza567"
    },
    status: "healthy",
    type: "manual",
    triggers: [],
    externalAPIs: ["Google Drive API"],
    sharedLibraries: ["CommonUtils", "PDFLib"],
    connectedFiles: [
      { id: "folder-1", name: "Generated Reports", type: "drive", url: "#", accessType: "write" }
    ],
    lastRun: hoursAgo(8),
    nextRun: null,
    avgExecutionTime: 22.6,
    owner: "sarah@company.com",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(8)
  },
  {
    id: "script-10",
    name: "Data Cleanup Utility",
    description: "Cleans and normalizes data in master sheets",
    parentFile: {
      id: "sheet-15",
      name: "Data Cleanup",
      type: "standalone",
      url: "https://script.google.com/d/abc890"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-10",
        type: "time-driven",
        function: "cleanupData",
        schedule: "0 2 * * 0",
        lastFire: daysAgo(5),
        nextFire: daysAgo(-2),
        status: "enabled"
      }
    ],
    externalAPIs: [],
    sharedLibraries: ["CommonUtils", "DataHelpers"],
    connectedFiles: [
      { id: "sheet-16", name: "Master Customer Data", type: "spreadsheet", url: "#", accessType: "read-write" },
      { id: "sheet-17", name: "Master Product Data", type: "spreadsheet", url: "#", accessType: "read-write" }
    ],
    lastRun: daysAgo(5),
    nextRun: daysAgo(-2),
    avgExecutionTime: 120.5,
    owner: "mike@company.com",
    createdAt: daysAgo(100),
    updatedAt: daysAgo(5)
  },
  {
    id: "script-11",
    name: "API Health Monitor",
    description: "Monitors external API health and uptime",
    parentFile: {
      id: "sheet-18",
      name: "API Status Dashboard",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/bcd123"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-11",
        type: "time-driven",
        function: "checkAPIHealth",
        schedule: "*/15 * * * *",
        lastFire: hoursAgo(0.25),
        nextFire: hoursFromNow(0.25),
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API", "Salesforce API", "HubSpot API", "Stripe API"],
    sharedLibraries: ["CommonUtils", "APIHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(0.25),
    nextRun: hoursFromNow(0.25),
    avgExecutionTime: 8.9,
    owner: "devops@company.com",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1)
  },
  {
    id: "script-12",
    name: "Customer Onboarding Workflow",
    description: "Automates customer onboarding steps",
    parentFile: {
      id: "sheet-19",
      name: "Customer Onboarding",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/efg456"
    },
    status: "healthy",
    type: "on-edit",
    triggers: [
      {
        id: "trigger-12",
        type: "on-edit",
        function: "handleOnboarding",
        lastFire: hoursAgo(3),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API", "HubSpot API", "Intercom API"],
    sharedLibraries: ["CommonUtils", "OnboardingLib"],
    connectedFiles: [
      { id: "doc-2", name: "Welcome Email Template", type: "document", url: "#", accessType: "read" }
    ],
    lastRun: hoursAgo(3),
    nextRun: null,
    avgExecutionTime: 4.5,
    owner: "sales@company.com",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3)
  },
  {
    id: "script-13",
    name: "Invoice Generator",
    description: "Generates and sends invoices to customers",
    parentFile: {
      id: "sheet-20",
      name: "Billing System",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/hij789"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-13",
        type: "time-driven",
        function: "generateInvoices",
        schedule: "0 10 1 * *",
        lastFire: daysAgo(22),
        nextFire: daysAgo(-8),
        status: "enabled"
      }
    ],
    externalAPIs: ["Stripe API", "QuickBooks API"],
    sharedLibraries: ["CommonUtils", "FinanceLib", "PDFLib"],
    connectedFiles: [
      { id: "folder-2", name: "Invoice Archive", type: "drive", url: "#", accessType: "write" }
    ],
    lastRun: daysAgo(22),
    nextRun: daysAgo(-8),
    avgExecutionTime: 35.2,
    owner: "finance@company.com",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(22)
  },
  {
    id: "script-14",
    name: "Lead Scoring Engine",
    description: "Calculates and updates lead scores",
    parentFile: {
      id: "sheet-21",
      name: "Lead Management",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/klm012"
    },
    status: "warning",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-14",
        type: "time-driven",
        function: "calculateLeadScores",
        schedule: "0 */6 * * *",
        lastFire: hoursAgo(5),
        nextFire: hoursFromNow(1),
        status: "enabled"
      }
    ],
    externalAPIs: ["HubSpot API", "Clearbit API"],
    sharedLibraries: ["CommonUtils", "LeadScoringLib"],
    connectedFiles: [],
    lastRun: hoursAgo(5),
    nextRun: hoursFromNow(1),
    avgExecutionTime: 18.7,
    owner: "marketing@company.com",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5)
  },
  {
    id: "script-15",
    name: "Backup Automation",
    description: "Creates backups of critical spreadsheets",
    parentFile: {
      id: "sheet-22",
      name: "Backup Manager",
      type: "standalone",
      url: "https://script.google.com/d/nop345"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-15",
        type: "time-driven",
        function: "createBackups",
        schedule: "0 3 * * *",
        lastFire: hoursAgo(21),
        nextFire: hoursFromNow(3),
        status: "enabled"
      }
    ],
    externalAPIs: ["Google Drive API"],
    sharedLibraries: ["CommonUtils"],
    connectedFiles: [
      { id: "folder-3", name: "Backup Storage", type: "drive", url: "#", accessType: "write" }
    ],
    lastRun: hoursAgo(21),
    nextRun: hoursFromNow(3),
    avgExecutionTime: 45.0,
    owner: "admin@company.com",
    createdAt: daysAgo(365),
    updatedAt: daysAgo(21)
  }
]

export const mockExecutions: Execution[] = [
  {
    id: "exec-1",
    scriptId: "script-3",
    scriptName: "Data Import Pipeline",
    function: "importData",
    startTime: hoursAgo(4),
    endTime: hoursAgo(3.9),
    duration: 6,
    status: "error",
    message: "TypeError: Cannot read property 'data' of undefined",
    stackTrace: "at importData (Code.gs:45)\n  at runImport (Code.gs:12)"
  },
  {
    id: "exec-2",
    scriptId: "script-2",
    scriptName: "Slack Notification Sync",
    function: "onEditHandler",
    startTime: hoursAgo(1),
    endTime: hoursAgo(0.99),
    duration: 3.6,
    status: "warning",
    message: "Rate limit approaching: 80% of quota used"
  },
  {
    id: "exec-3",
    scriptId: "script-1",
    scriptName: "Daily Sales Report",
    function: "generateDailyReport",
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.99),
    duration: 12.1,
    status: "success"
  },
  {
    id: "exec-4",
    scriptId: "script-6",
    scriptName: "Form Response Handler",
    function: "processFormResponse",
    startTime: hoursAgo(0.5),
    endTime: hoursAgo(0.49),
    duration: 2.3,
    status: "success"
  },
  {
    id: "exec-5",
    scriptId: "script-7",
    scriptName: "Calendar Sync",
    function: "syncCalendar",
    startTime: hoursAgo(0.5),
    endTime: hoursAgo(0.49),
    duration: 5.2,
    status: "success"
  },
  {
    id: "exec-6",
    scriptId: "script-11",
    scriptName: "API Health Monitor",
    function: "checkAPIHealth",
    startTime: hoursAgo(0.25),
    endTime: hoursAgo(0.24),
    duration: 9.1,
    status: "success"
  },
  {
    id: "exec-7",
    scriptId: "script-14",
    scriptName: "Lead Scoring Engine",
    function: "calculateLeadScores",
    startTime: hoursAgo(5),
    endTime: hoursAgo(4.99),
    duration: 19.8,
    status: "warning",
    message: "Some leads missing required fields"
  },
  {
    id: "exec-8",
    scriptId: "script-12",
    scriptName: "Customer Onboarding Workflow",
    function: "handleOnboarding",
    startTime: hoursAgo(3),
    endTime: hoursAgo(2.99),
    duration: 4.2,
    status: "success"
  }
]

export const mockBackups: Backup[] = [
  {
    id: "backup-1",
    date: daysAgo(0),
    scriptsCount: 15,
    size: 12582912, // 12 MB
    status: "complete",
    path: "/backups/2024-01-23"
  },
  {
    id: "backup-2",
    date: daysAgo(1),
    scriptsCount: 15,
    size: 12189696, // 11.6 MB
    status: "complete",
    path: "/backups/2024-01-22"
  },
  {
    id: "backup-3",
    date: daysAgo(2),
    scriptsCount: 15,
    size: 11796480, // 11.2 MB
    status: "complete",
    path: "/backups/2024-01-21"
  },
  {
    id: "backup-4",
    date: daysAgo(3),
    scriptsCount: 14,
    size: 11403264, // 10.9 MB
    status: "complete",
    path: "/backups/2024-01-20"
  },
  {
    id: "backup-5",
    date: daysAgo(4),
    scriptsCount: 14,
    size: 11010048, // 10.5 MB
    status: "partial",
    path: "/backups/2024-01-19"
  }
]

export const mockDashboardStats: DashboardStats = {
  totalScripts: 15,
  healthyCount: 11,
  warningCount: 2,
  errorCount: 1,
  executionsToday: 847,
  successRate: 98.2,
  avgExecutionTime: 8.3
}

// Chart data for execution trends
export const executionTrendData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  executions: Math.floor(Math.random() * 50) + 20,
  errors: Math.floor(Math.random() * 3)
}))

// Chart data for performance over time
export const performanceData = [
  { date: "Jan 17", avgTime: 8.2, executions: 720 },
  { date: "Jan 18", avgTime: 9.1, executions: 685 },
  { date: "Jan 19", avgTime: 7.8, executions: 812 },
  { date: "Jan 20", avgTime: 8.5, executions: 756 },
  { date: "Jan 21", avgTime: 8.0, executions: 798 },
  { date: "Jan 22", avgTime: 8.9, executions: 834 },
  { date: "Jan 23", avgTime: 8.3, executions: 847 }
]
