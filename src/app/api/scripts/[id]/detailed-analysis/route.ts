import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type {
  DetailedAutomationAnalysis,
  DataFlowItem,
  OperationDetail,
  FunctionExplanation,
  IntegrationDetail,
  BusinessLogicAnalysis,
  BusinessRequirement,
  BusinessRule,
  ValidationCheck,
  StatusFlow,
  StatusValue,
  StatusTransition,
  BusinessCalculation,
  DecisionNode,
  DecisionOutcome,
  DataTransformation
} from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Fetch script with all related data
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        files: true,
        apis: true,
        triggers: true,
        connectedFiles: true,
        functions: true,
        googleServices: true
      }
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    // Combine all code for analysis
    const allCode = script.files?.map(f => f.content).join('\n') || ''

    // Generate detailed analysis
    const analysis = generateDetailedAnalysis(script, allCode)

    return NextResponse.json({
      success: true,
      analysis,
      script: {
        id: script.id,
        name: script.name
      }
    })
  } catch (error) {
    console.error('Detailed analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to generate detailed analysis' },
      { status: 500 }
    )
  }
}

// Generate comprehensive detailed analysis
function generateDetailedAnalysis(
  script: {
    id: string
    name: string
    functionalSummary?: string | null
    complexity?: string | null
    linesOfCode?: number | null
    files?: Array<{ name: string; content: string; type: string }> | null
    apis?: Array<{ url: string; baseUrl: string; method: string; description: string; usageCount: number; codeLocation?: string | null }> | null
    triggers?: Array<{ type: string; functionName: string; schedule?: string | null; scheduleDescription?: string | null; sourceEvent?: string | null }> | null
    connectedFiles?: Array<{ fileId: string; fileName?: string | null; fileType: string; fileUrl?: string | null; accessType: string; extractedFrom: string }> | null
    functions?: Array<{ name: string; description?: string | null; parameters?: string | null; isPublic: boolean; lineCount?: number | null; fileName?: string | null }> | null
    googleServices?: Array<{ serviceName: string }> | null
  },
  allCode: string
): DetailedAutomationAnalysis {
  const name = script.name.toLowerCase()
  const services = script.googleServices?.map(s => s.serviceName) || []
  const apis = script.apis || []
  const triggers = script.triggers || []
  const functions = script.functions || []
  const connectedFiles = script.connectedFiles || []

  // Generate purpose based on name and content
  const purpose = inferPurpose(script.name, services, apis, triggers, allCode)

  // Generate detailed description
  const detailedDescription = generateDetailedDescription(script.name, services, apis, triggers, connectedFiles, allCode)

  // Explain triggers
  const triggerExplanation = explainTriggers(triggers, allCode)

  // Analyze data flow
  const dataFlow = analyzeDataFlow(services, apis, connectedFiles, allCode)

  // Break down operations step by step
  const operations = breakdownOperations(functions, apis, services, allCode)

  // Explain each function
  const functionBreakdown = explainFunctions(functions, allCode)

  // Detail integrations
  const integrations = detailIntegrations(services, apis)

  // Identify warnings
  const warnings = identifyWarnings(allCode, apis, triggers)

  // Generate recommendations
  const recommendations = generateRecommendations(script, allCode)

  // Extract business logic from code
  const businessLogic = extractBusinessLogic(script.name, allCode, functions)

  return {
    purpose,
    detailedDescription,
    triggerExplanation,
    dataFlow,
    operations,
    functionBreakdown,
    integrations,
    businessLogic,
    warnings,
    recommendations
  }
}

function inferPurpose(
  name: string,
  services: string[],
  apis: Array<{ description: string }>,
  triggers: Array<{ type: string }>,
  code: string
): string {
  const lower = name.toLowerCase()
  const apiDescs = apis.map(a => a.description.toLowerCase()).join(' ')
  const codeLower = code.toLowerCase()

  // Check for attendance/HR automation
  if (lower.includes('attendance') || apiDescs.includes('jisr') || codeLower.includes('attendance')) {
    if (lower.includes('reminder')) {
      return 'Automated employee attendance reminder system that notifies employees or managers about attendance-related matters'
    }
    return 'Employee attendance tracking and management automation that integrates with HR systems'
  }

  // Check for leave management
  if (lower.includes('leave') || codeLower.includes('leave request') || codeLower.includes('annual leave')) {
    if (lower.includes('encashment') || lower.includes('validation')) {
      return 'Leave encashment and validation system that processes employee leave balance calculations'
    }
    if (lower.includes('report')) {
      return 'Leave reporting automation that generates leave balance and usage reports'
    }
    return 'Leave management automation that handles employee leave requests and approvals'
  }

  // Check for recruiting
  if (lower.includes('workable') || apiDescs.includes('workable')) {
    return 'Recruiting and hiring workflow automation that syncs candidate data from Workable ATS'
  }

  // Check for notifications/reminders
  if (lower.includes('reminder') || lower.includes('notification')) {
    return 'Automated notification and reminder system that sends alerts to stakeholders'
  }

  // Check for document generation
  if (lower.includes('generator') || lower.includes('letter')) {
    return 'Document generation automation that creates formatted documents from templates'
  }

  // Check for data sync
  if (lower.includes('sync') || lower.includes('integration')) {
    return 'Data synchronization automation that keeps multiple systems in sync'
  }

  // Check for reports
  if (lower.includes('report')) {
    return 'Reporting automation that generates and distributes business reports'
  }

  // Check for business trip/travel
  if (lower.includes('trip') || lower.includes('travel')) {
    return 'Business travel management automation that handles trip requests and approvals'
  }

  // Check for contract management
  if (lower.includes('contract')) {
    return 'Contract management automation that handles employment contracts and documentation'
  }

  // Check for payroll
  if (lower.includes('payroll') || lower.includes('salary')) {
    return 'Payroll processing automation that handles salary calculations and deductions'
  }

  // Default based on services
  if (services.includes('Gmail')) {
    return 'Email workflow automation that sends automated emails based on business rules'
  }

  if (services.includes('Calendar')) {
    return 'Calendar management automation that schedules and manages events'
  }

  return 'Business process automation that streamlines operations using Google Workspace'
}

function generateDetailedDescription(
  name: string,
  services: string[],
  apis: Array<{ description: string; url: string; method: string }>,
  triggers: Array<{ type: string; scheduleDescription?: string | null }>,
  connectedFiles: Array<{ fileType: string; accessType: string }>,
  code: string
): string {
  const parts: string[] = []

  // Describe the main purpose
  parts.push(`This automation script "${name}" is designed to automate business processes.`)

  // Describe trigger
  if (triggers.length > 0) {
    const trigger = triggers[0]
    if (trigger.type === 'time-driven') {
      parts.push(`It runs automatically ${trigger.scheduleDescription || 'on a scheduled basis'}.`)
    } else if (trigger.type === 'on-open') {
      parts.push('It executes automatically when the associated spreadsheet or document is opened.')
    } else if (trigger.type === 'on-edit') {
      parts.push('It responds to changes made in the spreadsheet, triggering actions when cells are edited.')
    } else if (trigger.type === 'on-form-submit') {
      parts.push('It processes data automatically when form responses are submitted.')
    }
  } else {
    parts.push('It runs on-demand when manually triggered by a user.')
  }

  // Describe data sources
  const dataSources: string[] = []
  if (apis.some(a => a.description.toLowerCase().includes('jisr'))) {
    dataSources.push('Jisr HR management system')
  }
  if (apis.some(a => a.description.toLowerCase().includes('workable'))) {
    dataSources.push('Workable applicant tracking system')
  }
  if (apis.some(a => a.description.toLowerCase().includes('slack'))) {
    dataSources.push('Slack messaging platform')
  }
  if (services.includes('Sheets')) {
    dataSources.push('Google Sheets')
  }

  if (dataSources.length > 0) {
    parts.push(`The script integrates with ${dataSources.join(', ')}.`)
  }

  // Describe connected files
  const spreadsheets = connectedFiles.filter(f => f.fileType === 'spreadsheet')
  if (spreadsheets.length > 0) {
    const readSheets = spreadsheets.filter(f => f.accessType === 'read').length
    const writeSheets = spreadsheets.filter(f => f.accessType === 'write' || f.accessType === 'read-write').length
    if (readSheets > 0 && writeSheets > 0) {
      parts.push(`It reads data from and writes results to connected spreadsheets.`)
    } else if (readSheets > 0) {
      parts.push(`It reads configuration and data from connected spreadsheets.`)
    } else if (writeSheets > 0) {
      parts.push(`It outputs results to connected spreadsheets.`)
    }
  }

  // Describe key operations from code
  if (code.includes('UrlFetchApp.fetch')) {
    parts.push('The script makes HTTP requests to external services to fetch or send data.')
  }
  if (code.includes('GmailApp') || code.includes('MailApp')) {
    parts.push('It can send email notifications as part of its workflow.')
  }
  if (code.includes('Utilities.formatDate')) {
    parts.push('It handles date formatting for proper data display.')
  }

  return parts.join(' ')
}

function explainTriggers(
  triggers: Array<{ type: string; functionName: string; schedule?: string | null; scheduleDescription?: string | null; sourceEvent?: string | null }>,
  code: string
): { type: string; description: string; schedule?: string; events?: string[] } {
  if (triggers.length === 0) {
    // Check for doGet/doPost in code
    if (code.includes('function doGet(') || code.includes('function doPost(')) {
      return {
        type: 'Web App',
        description: 'This script is deployed as a web application. It responds to HTTP GET or POST requests, allowing external systems or users to trigger its functionality via URL.',
        events: ['HTTP GET request', 'HTTP POST request']
      }
    }

    return {
      type: 'Manual',
      description: 'This script runs only when manually triggered by a user. You can run it from the Apps Script editor, a custom menu in Google Sheets, or by calling a function directly.',
      events: ['Manual execution from Apps Script editor', 'Custom menu click', 'Button click']
    }
  }

  const mainTrigger = triggers[0]
  const additionalTriggers = triggers.slice(1)

  let description = ''
  let events: string[] = []

  switch (mainTrigger.type) {
    case 'time-driven':
      description = `This script runs automatically ${mainTrigger.scheduleDescription || mainTrigger.schedule || 'on a schedule'}. The trigger calls the "${mainTrigger.functionName}()" function at the specified interval. Time-driven triggers are ideal for batch processing, regular data syncs, or scheduled reports.`
      events = [`Scheduled execution calling ${mainTrigger.functionName}()`]
      break
    case 'on-open':
      description = `This script runs automatically when the parent document (spreadsheet, document, or form) is opened. The "${mainTrigger.functionName}()" function executes each time a user opens the file. This is commonly used to refresh data, set up custom menus, or validate document state.`
      events = [`Document open triggers ${mainTrigger.functionName}()`]
      break
    case 'on-edit':
      description = `This script responds to edits made in the spreadsheet. When any cell is modified, the "${mainTrigger.functionName}()" function is called with information about what changed. This enables real-time data validation, automatic calculations, or notifications when specific data changes.`
      events = [`Cell edit triggers ${mainTrigger.functionName}()`]
      break
    case 'on-form-submit':
      description = `This script processes form submissions automatically. When a Google Form linked to the spreadsheet receives a new response, the "${mainTrigger.functionName}()" function runs to process the submitted data. This is useful for automated workflows like approvals, notifications, or data processing.`
      events = [`Form submission triggers ${mainTrigger.functionName}()`]
      break
    default:
      description = `This script is triggered by ${mainTrigger.type} events, calling the "${mainTrigger.functionName}()" function.`
      events = [`${mainTrigger.type} event triggers ${mainTrigger.functionName}()`]
  }

  // Add additional triggers
  if (additionalTriggers.length > 0) {
    description += ` Additionally, there are ${additionalTriggers.length} more trigger(s) configured for other functions.`
    additionalTriggers.forEach(t => {
      events.push(`${t.type} triggers ${t.functionName}()`)
    })
  }

  return {
    type: mainTrigger.type,
    description,
    schedule: mainTrigger.schedule || undefined,
    events
  }
}

function analyzeDataFlow(
  services: string[],
  apis: Array<{ url: string; method: string; description: string }>,
  connectedFiles: Array<{ fileId: string; fileName?: string | null; fileType: string; accessType: string }>,
  code: string
): { inputs: DataFlowItem[]; processing: DataFlowItem[]; outputs: DataFlowItem[] } {
  const inputs: DataFlowItem[] = []
  const processing: DataFlowItem[] = []
  const outputs: DataFlowItem[] = []

  // Analyze API inputs
  apis.forEach(api => {
    if (api.method === 'GET') {
      inputs.push({
        name: api.description,
        description: `Fetches data from ${api.description} using HTTP GET request`,
        type: 'api',
        details: api.url.includes('${') ? 'Dynamic URL with parameters' : api.url
      })
    }
  })

  // Analyze spreadsheet inputs
  const readSpreadsheets = connectedFiles.filter(f => f.fileType === 'spreadsheet' && (f.accessType === 'read' || f.accessType === 'read-write'))
  readSpreadsheets.forEach(file => {
    inputs.push({
      name: file.fileName || 'Spreadsheet',
      description: `Reads data from spreadsheet ${file.fileName || file.fileId}`,
      type: 'spreadsheet',
      details: `File ID: ${file.fileId}`
    })
  })

  // Check for PropertiesService (configuration)
  if (code.includes('PropertiesService') || code.includes('getScriptProperties')) {
    inputs.push({
      name: 'Script Properties',
      description: 'Reads configuration values stored in Script Properties',
      type: 'database',
      details: 'Stores API keys, tokens, and configuration settings'
    })
  }

  // Processing steps
  if (code.includes('JSON.parse')) {
    processing.push({
      name: 'JSON Parsing',
      description: 'Parses JSON data received from API responses or stored data',
      type: 'database'
    })
  }

  if (code.includes('filter(') || code.includes('.filter(')) {
    processing.push({
      name: 'Data Filtering',
      description: 'Filters data based on specific criteria to process only relevant records',
      type: 'database'
    })
  }

  if (code.includes('map(') || code.includes('.map(')) {
    processing.push({
      name: 'Data Transformation',
      description: 'Transforms data structure or format for output',
      type: 'database'
    })
  }

  if (code.includes('Utilities.formatDate')) {
    processing.push({
      name: 'Date Formatting',
      description: 'Formats dates for proper display or API requirements',
      type: 'database'
    })
  }

  // Analyze API outputs
  apis.forEach(api => {
    if (api.method === 'POST' || api.method === 'PUT') {
      outputs.push({
        name: api.description,
        description: `Sends data to ${api.description} using HTTP ${api.method}`,
        type: 'api',
        details: api.url.includes('${') ? 'Dynamic URL with parameters' : api.url
      })
    }
  })

  // Analyze spreadsheet outputs
  const writeSpreadsheets = connectedFiles.filter(f => f.fileType === 'spreadsheet' && (f.accessType === 'write' || f.accessType === 'read-write'))
  writeSpreadsheets.forEach(file => {
    outputs.push({
      name: file.fileName || 'Spreadsheet',
      description: `Writes results to spreadsheet ${file.fileName || file.fileId}`,
      type: 'spreadsheet',
      details: `File ID: ${file.fileId}`
    })
  })

  // Check for email outputs
  if (code.includes('GmailApp.sendEmail') || code.includes('MailApp.sendEmail')) {
    outputs.push({
      name: 'Email Notification',
      description: 'Sends email notifications to specified recipients',
      type: 'email'
    })
  }

  // Check for Slack outputs
  if (apis.some(a => a.description.toLowerCase().includes('slack'))) {
    outputs.push({
      name: 'Slack Message',
      description: 'Sends messages to Slack channels or users',
      type: 'api',
      details: 'Slack Webhook or API'
    })
  }

  return { inputs, processing, outputs }
}

function breakdownOperations(
  functions: Array<{ name: string; description?: string | null; isPublic: boolean; lineCount?: number | null }>,
  apis: Array<{ description: string; method: string }>,
  services: string[],
  code: string
): OperationDetail[] {
  const operations: OperationDetail[] = []
  let step = 1

  // Entry point function (usually the main or trigger function)
  const entryPoint = functions.find(f =>
    f.isPublic && (
      f.name.toLowerCase().includes('main') ||
      f.name.startsWith('do') ||
      f.name.startsWith('on') ||
      (f.lineCount && f.lineCount > 20)
    )
  ) || functions.find(f => f.isPublic)

  if (entryPoint) {
    operations.push({
      step: step++,
      name: 'Script Entry Point',
      description: `Execution begins with the ${entryPoint.name}() function${entryPoint.description ? `. ${entryPoint.description}` : ''}`,
      functionName: entryPoint.name,
      inputs: ['Trigger event or manual call'],
      outputs: ['Initiates subsequent operations']
    })
  }

  // Configuration/Setup
  if (code.includes('PropertiesService') || code.includes('getScriptProperties')) {
    operations.push({
      step: step++,
      name: 'Load Configuration',
      description: 'Retrieves stored settings, API keys, and configuration values from Script Properties',
      inputs: ['Script Properties storage'],
      outputs: ['Configuration object with API credentials and settings']
    })
  }

  // Data fetching from APIs
  const fetchApis = apis.filter(a => a.method === 'GET')
  if (fetchApis.length > 0) {
    operations.push({
      step: step++,
      name: 'Fetch External Data',
      description: `Makes API calls to retrieve data from: ${fetchApis.map(a => a.description).join(', ')}`,
      inputs: ['API endpoints', 'Authentication tokens'],
      outputs: ['Raw API response data']
    })
  }

  // Spreadsheet data reading
  if (services.includes('Sheets') && code.includes('getValues()')) {
    operations.push({
      step: step++,
      name: 'Read Spreadsheet Data',
      description: 'Reads data from one or more Google Sheets ranges for processing',
      inputs: ['Spreadsheet ranges'],
      outputs: ['2D array of cell values']
    })
  }

  // Data processing
  if (code.includes('forEach') || code.includes('.map(') || code.includes('.filter(')) {
    operations.push({
      step: step++,
      name: 'Process Data',
      description: 'Iterates through records, transforms data formats, filters relevant entries, and prepares data for output',
      inputs: ['Raw data from APIs and spreadsheets'],
      outputs: ['Processed and formatted data'],
      dependencies: ['Data fetch operations']
    })
  }

  // Validation
  if (code.includes('validation') || code.includes('validate') || code.includes('check')) {
    operations.push({
      step: step++,
      name: 'Validate Data',
      description: 'Validates data against business rules and checks for errors or missing information',
      inputs: ['Processed data'],
      outputs: ['Validated data', 'Validation errors (if any)']
    })
  }

  // Write to spreadsheet
  if (services.includes('Sheets') && code.includes('setValues(')) {
    operations.push({
      step: step++,
      name: 'Update Spreadsheet',
      description: 'Writes processed data back to Google Sheets, updating cells with new values',
      inputs: ['Processed data array'],
      outputs: ['Updated spreadsheet cells']
    })
  }

  // Send to external APIs
  const postApis = apis.filter(a => a.method === 'POST' || a.method === 'PUT')
  if (postApis.length > 0) {
    operations.push({
      step: step++,
      name: 'Send Data to External Systems',
      description: `Posts data to: ${postApis.map(a => a.description).join(', ')}`,
      inputs: ['Processed data', 'API configuration'],
      outputs: ['API response confirmation']
    })
  }

  // Email notifications
  if (code.includes('GmailApp') || code.includes('MailApp')) {
    operations.push({
      step: step++,
      name: 'Send Email Notifications',
      description: 'Composes and sends email notifications to relevant recipients',
      inputs: ['Recipient list', 'Email content', 'Data for email body'],
      outputs: ['Sent email confirmations']
    })
  }

  // Logging
  if (code.includes('Logger.log') || code.includes('console.log')) {
    operations.push({
      step: step++,
      name: 'Log Execution Details',
      description: 'Records execution details, processed records count, and any errors for debugging',
      inputs: ['Execution statistics'],
      outputs: ['Log entries']
    })
  }

  return operations
}

function explainFunctions(
  functions: Array<{ name: string; description?: string | null; parameters?: string | null; isPublic: boolean; lineCount?: number | null; fileName?: string | null }>,
  code: string
): FunctionExplanation[] {
  return functions.map(func => {
    // Parse parameters
    let params: { name: string; description: string }[] = []
    if (func.parameters) {
      try {
        const paramList = JSON.parse(func.parameters)
        params = paramList.map((p: string) => ({
          name: p,
          description: inferParameterDescription(p, func.name)
        }))
      } catch {
        params = []
      }
    }

    // Determine if entry point
    const isEntryPoint = func.isPublic && (
      func.name.startsWith('do') ||
      func.name.startsWith('on') ||
      func.name.toLowerCase().includes('main') ||
      func.name.toLowerCase().includes('run')
    )

    // Generate what it does
    const whatItDoes = inferFunctionPurpose(func.name, code)

    return {
      name: func.name,
      purpose: func.description || inferFunctionPurposeShort(func.name),
      whatItDoes,
      parameters: params,
      returns: inferReturnType(func.name),
      isEntryPoint
    }
  })
}

function inferParameterDescription(paramName: string, funcName: string): string {
  const lower = paramName.toLowerCase()
  if (lower === 'e' || lower === 'event') return 'Trigger event object containing information about what triggered the function'
  if (lower.includes('sheet')) return 'Reference to a Google Sheets sheet object'
  if (lower.includes('row')) return 'Row number or row data array'
  if (lower.includes('data')) return 'Data to be processed or stored'
  if (lower.includes('id')) return 'Unique identifier'
  if (lower.includes('url')) return 'URL string'
  if (lower.includes('email')) return 'Email address'
  if (lower.includes('date')) return 'Date value'
  if (lower.includes('config')) return 'Configuration object'
  return `Parameter for ${funcName}`
}

function inferFunctionPurpose(name: string, code: string): string[] {
  const purposes: string[] = []
  const lower = name.toLowerCase()

  if (lower.includes('fetch') || lower.includes('get')) {
    purposes.push('Retrieves data from an external source or storage')
  }
  if (lower.includes('send') || lower.includes('post')) {
    purposes.push('Sends data to an external service or recipient')
  }
  if (lower.includes('process') || lower.includes('handle')) {
    purposes.push('Processes and transforms data according to business logic')
  }
  if (lower.includes('validate') || lower.includes('check')) {
    purposes.push('Validates data against defined rules and constraints')
  }
  if (lower.includes('format')) {
    purposes.push('Formats data for display or output')
  }
  if (lower.includes('update') || lower.includes('set')) {
    purposes.push('Updates records or settings')
  }
  if (lower.includes('create') || lower.includes('add')) {
    purposes.push('Creates new records or entries')
  }
  if (lower.includes('delete') || lower.includes('remove')) {
    purposes.push('Removes or archives records')
  }
  if (lower.includes('notify') || lower.includes('alert') || lower.includes('email')) {
    purposes.push('Sends notifications to stakeholders')
  }
  if (lower.includes('log')) {
    purposes.push('Records activity for debugging or auditing')
  }

  if (purposes.length === 0) {
    purposes.push(`Executes the ${name} operation as part of the automation workflow`)
  }

  return purposes
}

function inferFunctionPurposeShort(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('fetch') || lower.includes('get')) return 'Retrieves data'
  if (lower.includes('send') || lower.includes('post')) return 'Sends data'
  if (lower.includes('process')) return 'Processes data'
  if (lower.includes('validate')) return 'Validates data'
  if (lower.includes('format')) return 'Formats data'
  if (lower.includes('update')) return 'Updates records'
  if (lower.includes('create')) return 'Creates records'
  if (lower.includes('delete')) return 'Removes records'
  if (lower.includes('notify') || lower.includes('email')) return 'Sends notifications'
  if (lower.includes('log')) return 'Logs activity'
  if (lower.startsWith('on')) return 'Event handler'
  if (lower.startsWith('do')) return 'Web app handler'
  return 'Performs automation task'
}

function inferReturnType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('get') || lower.includes('fetch')) return 'Data object or array'
  if (lower.includes('is') || lower.includes('has') || lower.includes('check')) return 'Boolean'
  if (lower.includes('count')) return 'Number'
  if (lower.includes('find')) return 'Object or null'
  if (lower.startsWith('do')) return 'HtmlOutput or TextOutput'
  return 'void'
}

function detailIntegrations(
  services: string[],
  apis: Array<{ url: string; description: string; method: string }>
): IntegrationDetail[] {
  const integrations: IntegrationDetail[] = []

  // Google Services
  services.forEach(service => {
    const integration: IntegrationDetail = {
      name: service,
      type: 'google-service',
      description: getServiceDescription(service),
      operations: getServiceOperations(service)
    }
    integrations.push(integration)
  })

  // External APIs
  const apiGroups = new Map<string, typeof apis>()
  apis.forEach(api => {
    const key = api.description
    if (!apiGroups.has(key)) {
      apiGroups.set(key, [])
    }
    apiGroups.get(key)!.push(api)
  })

  apiGroups.forEach((groupApis, name) => {
    integrations.push({
      name,
      type: 'api',
      description: getApiIntegrationDescription(name),
      endpoints: groupApis.map(a => `${a.method} ${a.url.substring(0, 50)}...`),
      operations: groupApis.map(a => `${a.method} request`),
      authentication: 'API Key or OAuth token from Script Properties'
    })
  })

  return integrations
}

function getServiceDescription(service: string): string {
  const descriptions: Record<string, string> = {
    'Sheets': 'Google Sheets API - Read and write spreadsheet data, create charts, manage formatting',
    'Drive': 'Google Drive API - Manage files and folders, share documents, handle file uploads',
    'Gmail': 'Gmail API - Send emails, read inbox, manage labels and filters',
    'Calendar': 'Google Calendar API - Create and manage events, check availability, send invitations',
    'Docs': 'Google Docs API - Create and edit documents, manage formatting, insert content',
    'Forms': 'Google Forms API - Create forms, read responses, manage form settings',
    'URL Fetch': 'HTTP client - Make external API calls to any web service',
    'Properties': 'Script Properties - Store configuration, API keys, and persistent data',
    'Cache': 'Cache Service - Temporarily store data for performance optimization',
    'Lock': 'Lock Service - Prevent concurrent execution conflicts',
    'HTML': 'HTML Service - Create custom UI dialogs and web app interfaces',
    'Utilities': 'Utility functions - Date formatting, encoding, UUID generation',
    'Logger': 'Logging Service - Record execution details and debug information',
    'Script': 'Script Service - Manage triggers, get script information'
  }
  return descriptions[service] || `${service} Google Workspace service`
}

function getServiceOperations(service: string): string[] {
  const operations: Record<string, string[]> = {
    'Sheets': ['Read cell values', 'Write data to ranges', 'Format cells', 'Create sheets'],
    'Drive': ['Get files', 'Create folders', 'Share files', 'Move files'],
    'Gmail': ['Send emails', 'Create drafts', 'Read messages'],
    'Calendar': ['Create events', 'Get events', 'Update events'],
    'URL Fetch': ['HTTP GET requests', 'HTTP POST requests', 'Handle responses'],
    'Properties': ['Get properties', 'Set properties', 'Delete properties'],
    'Logger': ['Log messages', 'Get logs']
  }
  return operations[service] || ['Various operations']
}

function getApiIntegrationDescription(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('jisr')) {
    return 'Jisr HR Management System - Attendance tracking, employee data, leave management'
  }
  if (lower.includes('slack')) {
    return 'Slack Messaging Platform - Send messages, notifications, and alerts to channels'
  }
  if (lower.includes('workable')) {
    return 'Workable ATS - Recruiting, candidate tracking, job postings'
  }
  return `${name} - External service integration`
}

function identifyWarnings(
  code: string,
  apis: Array<{ url: string }>,
  triggers: Array<{ type: string }>
): string[] {
  const warnings: string[] = []

  // Check for hardcoded credentials
  if (code.includes('password') || code.includes('apiKey =') || code.includes('token =')) {
    if (!code.includes('PropertiesService') || code.match(/(password|apiKey|token)\s*=\s*['"][^'"]+['"]/)) {
      warnings.push('Potential hardcoded credentials detected. Consider using Script Properties for sensitive data.')
    }
  }

  // Check for no error handling
  if (!code.includes('try') && !code.includes('catch')) {
    warnings.push('No error handling detected. Consider adding try-catch blocks for robustness.')
  }

  // Check for no logging
  if (!code.includes('Logger.log') && !code.includes('console.log')) {
    warnings.push('No logging detected. Consider adding logging for debugging and monitoring.')
  }

  // Check for large data operations without pagination
  if (code.includes('getValues()') && !code.includes('getRange(') && code.includes('getDataRange()')) {
    warnings.push('Reading entire data range may cause performance issues with large datasets.')
  }

  // Check for missing rate limiting on API calls
  if (apis.length > 2 && !code.includes('Utilities.sleep')) {
    warnings.push('Multiple API calls without rate limiting may hit quota limits.')
  }

  return warnings
}

function generateRecommendations(
  script: { linesOfCode?: number | null; complexity?: string | null },
  code: string
): string[] {
  const recommendations: string[] = []

  // Complexity-based recommendations
  if (script.complexity === 'high' || (script.linesOfCode && script.linesOfCode > 500)) {
    recommendations.push('Consider splitting this script into smaller, more focused functions for better maintainability.')
  }

  // Error handling
  if (!code.includes('try') || !code.includes('catch')) {
    recommendations.push('Add error handling with try-catch blocks to gracefully handle failures.')
  }

  // Logging
  if (!code.includes('Logger.log')) {
    recommendations.push('Add logging statements to track execution progress and debug issues.')
  }

  // Configuration
  if (!code.includes('PropertiesService')) {
    recommendations.push('Use Script Properties to store configuration values instead of hardcoding.')
  }

  // Documentation
  if (!code.includes('/**') && !code.includes('//')) {
    recommendations.push('Add JSDoc comments and inline documentation for better code understanding.')
  }

  // Caching
  if (code.includes('UrlFetchApp.fetch') && !code.includes('CacheService')) {
    recommendations.push('Consider caching API responses to reduce external calls and improve performance.')
  }

  if (recommendations.length === 0) {
    recommendations.push('This script follows good practices. Consider periodic reviews for optimization opportunities.')
  }

  return recommendations
}

// ============================================================================
// BUSINESS LOGIC EXTRACTION FUNCTIONS
// ============================================================================

function extractBusinessLogic(
  scriptName: string,
  code: string,
  functions: Array<{ name: string; description?: string | null; parameters?: string | null; isPublic: boolean; lineCount?: number | null; fileName?: string | null }>
): BusinessLogicAnalysis {
  // Extract all components of business logic from code
  const businessRules = extractBusinessRules(code)
  const validations = extractValidations(code)
  const statusFlows = extractStatusFlows(code)
  const calculations = extractCalculations(code)
  const decisionTree = extractDecisionTree(code)
  const dataTransformations = extractDataTransformations(code)

  // Generate high-level business requirements based on extracted logic
  const businessRequirements = generateBusinessRequirements(
    scriptName,
    code,
    businessRules,
    validations,
    calculations,
    functions
  )

  return {
    businessRequirements,
    businessRules,
    validations,
    statusFlows,
    calculations,
    decisionTree,
    dataTransformations
  }
}

function extractBusinessRules(code: string): BusinessRule[] {
  const rules: BusinessRule[] = []
  let ruleId = 1

  // Pattern 1: if statements with business conditions
  const ifPatterns = [
    // Balance/limit checks
    {
      pattern: /if\s*\(\s*(\w+)\s*(<=?|>=?|===?|!==?)\s*(\w+|\d+)\s*\)/g,
      type: 'comparison'
    },
    // Status checks
    {
      pattern: /if\s*\(\s*(\w+)\.?(status|state|type|category)\s*===?\s*['"](\w+)['"]\s*\)/gi,
      type: 'status-check'
    },
    // Null/empty checks
    {
      pattern: /if\s*\(\s*!?\s*(\w+)\s*(\|\||&&)?\s*(===?\s*(null|undefined|''|""))?/g,
      type: 'null-check'
    },
    // Date comparisons
    {
      pattern: /if\s*\(\s*(\w+Date|\w+_date|date\w*)\s*(<=?|>=?)\s*(\w+Date|\w+_date|new Date|today)/gi,
      type: 'date-check'
    },
    // Count/length checks
    {
      pattern: /if\s*\(\s*(\w+)\.(length|count|size)\s*(<=?|>=?|===?)\s*(\d+)\s*\)/g,
      type: 'count-check'
    }
  ]

  // Find all if statements with context
  const ifStatementRegex = /if\s*\(([^{]+)\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  let match

  while ((match = ifStatementRegex.exec(code)) !== null) {
    const condition = match[1].trim()
    const body = match[2].trim()

    // Skip very simple or framework conditions
    if (condition.length < 5 || condition.includes('typeof') || condition.includes('instanceof')) {
      continue
    }

    const rule = parseBusinessRule(condition, body, ruleId++, code, match.index)
    if (rule) {
      rules.push(rule)
    }
  }

  // Pattern 2: Ternary operators with business logic
  const ternaryRegex = /(\w+)\s*=\s*([^?]+)\s*\?\s*(['"][^'"]+['"]|[^:]+)\s*:\s*(['"][^'"]+['"]|[^;]+)/g
  while ((match = ternaryRegex.exec(code)) !== null) {
    const variable = match[1].trim()
    const condition = match[2].trim()
    const trueValue = match[3].trim()
    const falseValue = match[4].trim()

    // Only include if it looks like business logic
    if (isBusinessLogicCondition(condition)) {
      rules.push({
        id: `BR${ruleId++}`,
        name: `${formatVariableName(variable)} Assignment Rule`,
        description: `Determines ${formatVariableName(variable)} based on condition`,
        condition: condition,
        conditionExplained: explainCondition(condition),
        action: `Set ${formatVariableName(variable)} to ${trueValue} or ${falseValue}`,
        actionExplained: `If ${explainCondition(condition)}, then ${formatVariableName(variable)} is set to ${formatValue(trueValue)}; otherwise it's set to ${formatValue(falseValue)}`,
        severity: determineSeverity(variable, condition)
      })
    }
  }

  // Pattern 3: Switch statements (often used for status-based logic)
  const switchRegex = /switch\s*\(\s*(\w+\.?\w*)\s*\)\s*\{([\s\S]*?)\}/g
  while ((match = switchRegex.exec(code)) !== null) {
    const switchVar = match[1]
    const caseBlock = match[2]

    const cases = extractSwitchCases(caseBlock)
    if (cases.length > 0) {
      rules.push({
        id: `BR${ruleId++}`,
        name: `${formatVariableName(switchVar)} Processing Rules`,
        description: `Handles different values of ${formatVariableName(switchVar)}`,
        condition: `Based on ${formatVariableName(switchVar)} value`,
        conditionExplained: `Different actions are taken depending on the value of ${formatVariableName(switchVar)}`,
        action: cases.map(c => `When ${c.value}: ${c.action}`).join('; '),
        actionExplained: cases.map(c => `If ${formatVariableName(switchVar)} equals ${c.value}, then ${c.actionExplained}`).join('. '),
        severity: 'important'
      })
    }
  }

  return rules
}

function parseBusinessRule(condition: string, body: string, id: number, fullCode: string, position: number): BusinessRule | null {
  // Skip non-business conditions
  if (!isBusinessLogicCondition(condition)) {
    return null
  }

  // Extract the action from the body
  const action = extractActionFromBody(body)
  if (!action) {
    return null
  }

  // Find the line number for code location
  const lineNumber = fullCode.substring(0, position).split('\n').length

  return {
    id: `BR${id}`,
    name: inferRuleName(condition, action),
    description: inferRuleDescription(condition, action),
    condition: condition,
    conditionExplained: explainCondition(condition),
    action: action.summary,
    actionExplained: action.explanation,
    codeLocation: `Line ${lineNumber}`,
    severity: determineSeverity(condition, action.summary)
  }
}

function isBusinessLogicCondition(condition: string): boolean {
  const businessKeywords = [
    'status', 'state', 'balance', 'amount', 'count', 'total', 'limit',
    'approved', 'rejected', 'pending', 'active', 'inactive', 'valid', 'invalid',
    'leave', 'days', 'hours', 'date', 'deadline', 'due', 'expir',
    'employee', 'manager', 'admin', 'user', 'role', 'permission',
    'request', 'application', 'submission', 'approval',
    'salary', 'payment', 'deduction', 'bonus', 'encash',
    'available', 'remaining', 'used', 'consumed', 'allocated',
    'probation', 'contract', 'employment', 'joining', 'termination',
    'email', 'notify', 'alert', 'send', 'message'
  ]

  const lowerCondition = condition.toLowerCase()
  return businessKeywords.some(keyword => lowerCondition.includes(keyword))
}

function extractActionFromBody(body: string): { summary: string; explanation: string } | null {
  const actions: string[] = []
  const explanations: string[] = []

  // Look for status updates
  const statusMatch = body.match(/(\w+)\s*\[\s*['"]?status['"]?\s*\]\s*=\s*['"](\w+)['"]/i) ||
                      body.match(/\.status\s*=\s*['"](\w+)['"]/i) ||
                      body.match(/set\w*Status\s*\(\s*['"](\w+)['"]/i)
  if (statusMatch) {
    const status = statusMatch[2] || statusMatch[1]
    actions.push(`Set status to "${status}"`)
    explanations.push(`Updates the status to "${status}"`)
  }

  // Look for value assignments with business meaning
  const assignmentMatch = body.match(/(\w+)\s*=\s*([^;]+)/g)
  if (assignmentMatch) {
    assignmentMatch.forEach(assign => {
      const parts = assign.split('=')
      if (parts.length === 2) {
        const varName = parts[0].trim()
        const value = parts[1].trim()
        if (isBusinessVariable(varName)) {
          actions.push(`Update ${formatVariableName(varName)}`)
          explanations.push(`Sets ${formatVariableName(varName)} to ${formatValue(value)}`)
        }
      }
    })
  }

  // Look for email/notification sending
  if (body.includes('sendEmail') || body.includes('GmailApp') || body.includes('MailApp')) {
    actions.push('Send email notification')
    explanations.push('Sends an email notification to relevant parties')
  }

  // Look for Slack/messaging
  if (body.includes('slack') || body.includes('postMessage') || body.includes('webhook')) {
    actions.push('Send Slack/chat message')
    explanations.push('Posts a message to Slack or messaging platform')
  }

  // Look for data writes
  if (body.includes('setValues') || body.includes('setValue')) {
    actions.push('Update spreadsheet data')
    explanations.push('Writes updated data back to the spreadsheet')
  }

  // Look for API calls
  if (body.includes('UrlFetchApp') || body.includes('fetch(')) {
    actions.push('Call external API')
    explanations.push('Makes a request to an external service')
  }

  // Look for return/throw statements
  const returnMatch = body.match(/return\s+([^;]+)/i)
  if (returnMatch) {
    actions.push(`Return ${formatValue(returnMatch[1].trim())}`)
    explanations.push(`Returns ${formatValue(returnMatch[1].trim())} to the caller`)
  }

  const throwMatch = body.match(/throw\s+(?:new\s+)?(\w+)\s*\(\s*['"]([^'"]+)['"]/i)
  if (throwMatch) {
    actions.push(`Throw error: ${throwMatch[2]}`)
    explanations.push(`Stops execution with error message: "${throwMatch[2]}"`)
  }

  if (actions.length === 0) {
    return null
  }

  return {
    summary: actions.join(', '),
    explanation: explanations.join('. ')
  }
}

function isBusinessVariable(varName: string): boolean {
  const businessVars = [
    'status', 'state', 'balance', 'amount', 'total', 'count', 'result',
    'approved', 'rejected', 'valid', 'error', 'message', 'reason',
    'days', 'hours', 'date', 'remaining', 'available', 'used'
  ]
  const lower = varName.toLowerCase()
  return businessVars.some(v => lower.includes(v))
}

function formatVariableName(name: string): string {
  // Convert camelCase or snake_case to readable format
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
}

function formatValue(value: string): string {
  // Clean up and format a value for display
  const cleaned = value.trim().replace(/['"]/g, '')
  if (cleaned.length > 50) {
    return cleaned.substring(0, 47) + '...'
  }
  return cleaned || '(empty)'
}

function explainCondition(condition: string): string {
  let explained = condition

  // Replace common operators with words
  explained = explained.replace(/\s*===\s*/g, ' equals ')
  explained = explained.replace(/\s*!==\s*/g, ' does not equal ')
  explained = explained.replace(/\s*>=\s*/g, ' is greater than or equal to ')
  explained = explained.replace(/\s*<=\s*/g, ' is less than or equal to ')
  explained = explained.replace(/\s*>\s*/g, ' is greater than ')
  explained = explained.replace(/\s*<\s*/g, ' is less than ')
  explained = explained.replace(/\s*&&\s*/g, ' AND ')
  explained = explained.replace(/\s*\|\|\s*/g, ' OR ')
  explained = explained.replace(/!\s*(\w+)/g, '$1 is false/empty')

  // Clean up variable names
  explained = explained.replace(/(\w+)\.(\w+)/g, (_, obj, prop) => `${formatVariableName(obj)}'s ${formatVariableName(prop)}`)

  // Clean up quotes
  explained = explained.replace(/['"]/g, '')

  return explained
}

function determineSeverity(context: string, action: string): 'critical' | 'important' | 'standard' {
  const lower = (context + ' ' + action).toLowerCase()

  // Critical: affects money, permissions, or final status
  if (lower.includes('reject') || lower.includes('denied') || lower.includes('terminate') ||
      lower.includes('payment') || lower.includes('salary') || lower.includes('deduct') ||
      lower.includes('permission') || lower.includes('access') || lower.includes('security')) {
    return 'critical'
  }

  // Important: affects approval, notifications, or data changes
  if (lower.includes('approv') || lower.includes('notify') || lower.includes('email') ||
      lower.includes('update') || lower.includes('status') || lower.includes('submit')) {
    return 'important'
  }

  return 'standard'
}

function inferRuleName(condition: string, action: { summary: string }): string {
  const lower = condition.toLowerCase()

  if (lower.includes('balance') && lower.includes('<')) {
    return 'Insufficient Balance Check'
  }
  if (lower.includes('status') && lower.includes('approved')) {
    return 'Approval Status Verification'
  }
  if (lower.includes('status') && lower.includes('pending')) {
    return 'Pending Status Handler'
  }
  if (lower.includes('date') || lower.includes('deadline')) {
    return 'Date/Deadline Validation'
  }
  if (lower.includes('probation')) {
    return 'Probation Period Check'
  }
  if (lower.includes('leave') || lower.includes('days')) {
    return 'Leave Days Validation'
  }
  if (lower.includes('manager') || lower.includes('approval')) {
    return 'Manager Approval Rule'
  }
  if (lower.includes('email') || lower.includes('valid')) {
    return 'Data Validation Rule'
  }

  return `Business Rule: ${action.summary.substring(0, 30)}`
}

function inferRuleDescription(condition: string, action: { summary: string }): string {
  const lower = condition.toLowerCase()

  if (lower.includes('balance')) {
    return 'Checks if balance meets the required threshold before proceeding'
  }
  if (lower.includes('status')) {
    return 'Validates the current status before taking action'
  }
  if (lower.includes('date') || lower.includes('deadline')) {
    return 'Ensures date-related requirements are met'
  }
  if (lower.includes('leave') || lower.includes('days')) {
    return 'Validates leave request against available days'
  }

  return `Evaluates condition and performs: ${action.summary}`
}

function extractSwitchCases(caseBlock: string): Array<{ value: string; action: string; actionExplained: string }> {
  const cases: Array<{ value: string; action: string; actionExplained: string }> = []
  const caseRegex = /case\s+['"]?(\w+)['"]?\s*:([\s\S]*?)(?=case|default|$)/g

  let match
  while ((match = caseRegex.exec(caseBlock)) !== null) {
    const value = match[1]
    const body = match[2]
    const action = extractActionFromBody(body)
    if (action) {
      cases.push({
        value,
        action: action.summary,
        actionExplained: action.explanation
      })
    }
  }

  return cases
}

function extractValidations(code: string): ValidationCheck[] {
  const validations: ValidationCheck[] = []
  let validationId = 1

  // Pattern 1: Explicit validation functions
  const validationFuncRegex = /function\s+(validate\w*|check\w*|verify\w*)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/gi
  let match

  while ((match = validationFuncRegex.exec(code)) !== null) {
    const funcName = match[1]
    const funcBody = match[2]

    // Extract conditions from the function body
    const ifMatches = funcBody.matchAll(/if\s*\(\s*!?\s*([^)]+)\s*\)\s*\{([^}]*)\}/g)
    for (const ifMatch of ifMatches) {
      const condition = ifMatch[1].trim()
      const body = ifMatch[2].trim()

      // Look for error returns or throws
      const errorMatch = body.match(/(?:return\s+false|throw|return\s*\{[^}]*error|message\s*=\s*['"]([^'"]+)['"])/i)

      if (errorMatch || body.includes('return') || body.includes('throw')) {
        const fieldMatch = condition.match(/(\w+)\.?(\w*)/i)
        const field = fieldMatch ? (fieldMatch[2] || fieldMatch[1]) : 'field'

        validations.push({
          id: `V${validationId++}`,
          field: field,
          fieldDescription: formatVariableName(field),
          condition: condition,
          conditionExplained: explainCondition(condition),
          errorMessage: errorMatch?.[1] || extractErrorMessage(body),
          onPass: 'Continue processing',
          onFail: extractFailAction(body),
          codeLocation: `In ${funcName}()`
        })
      }
    }
  }

  // Pattern 2: Inline validations with common patterns
  const inlineValidationPatterns = [
    // Required field check
    {
      regex: /if\s*\(\s*!(\w+)\s*(?:\|\|\s*\1\s*===?\s*['"]?['"]?\s*)?\)\s*\{([^}]+)\}/g,
      type: 'required'
    },
    // Length validation
    {
      regex: /if\s*\(\s*(\w+)\.length\s*([<>=!]+)\s*(\d+)\s*\)\s*\{([^}]+)\}/g,
      type: 'length'
    },
    // Range validation
    {
      regex: /if\s*\(\s*(\w+)\s*([<>]=?)\s*(\d+)\s*(?:&&\s*\1\s*([<>]=?)\s*(\d+))?\s*\)\s*\{([^}]+)\}/g,
      type: 'range'
    },
    // Email validation
    {
      regex: /if\s*\(\s*!?(\w+)\.?(?:match|test|includes)\s*\(\s*(?:\/[^\/]+\/|['"][^'"]+['"])\s*\)\s*\)\s*\{([^}]+)\}/g,
      type: 'format'
    }
  ]

  inlineValidationPatterns.forEach(pattern => {
    const matches = Array.from(code.matchAll(pattern.regex))
    for (const m of matches) {
      const field = m[1]
      if (isBusinessVariable(field)) {
        const body = m[m.length - 1]
        validations.push({
          id: `V${validationId++}`,
          field: field,
          fieldDescription: formatVariableName(field),
          condition: m[0].match(/if\s*\(([^)]+)\)/)?.[1] || '',
          conditionExplained: `Validates ${formatVariableName(field)} (${pattern.type} check)`,
          errorMessage: extractErrorMessage(body),
          onPass: 'Continue with valid data',
          onFail: extractFailAction(body)
        })
      }
    }
  })

  // Pattern 3: Specific business validations
  const businessValidationPatterns = [
    {
      pattern: /(\w+balance|\w+Balance|balance\w*)\s*([<>]=?)\s*(\w+days|\w+Days|requested\w*|\w+amount)/gi,
      field: 'Balance',
      description: 'Checks if available balance is sufficient for the request'
    },
    {
      pattern: /(?:probation|Probation)\s*[=!]=\s*(?:true|false)/gi,
      field: 'Probation Status',
      description: 'Verifies employee probation period status'
    },
    {
      pattern: /(?:joining|startDate|start_date)\s*[<>]=?\s*(?:today|new Date|current)/gi,
      field: 'Employment Date',
      description: 'Validates employment dates against current date'
    },
    {
      pattern: /(?:overlap|conflict)\s*(?:===?\s*true|\s*&&|\s*\|\|)/gi,
      field: 'Schedule Conflict',
      description: 'Checks for scheduling conflicts with existing records'
    }
  ]

  businessValidationPatterns.forEach(pattern => {
    if (pattern.pattern.test(code)) {
      validations.push({
        id: `V${validationId++}`,
        field: pattern.field,
        fieldDescription: pattern.field,
        condition: code.match(pattern.pattern)?.[0] || '',
        conditionExplained: pattern.description,
        onPass: 'Validation passes, continue processing',
        onFail: 'Validation fails, reject or require correction'
      })
    }
  })

  return validations
}

function extractErrorMessage(body: string): string | undefined {
  const messageMatch = body.match(/(?:message|error|reason)\s*[:=]\s*['"]([^'"]+)['"]/i) ||
                       body.match(/throw\s+(?:new\s+)?\w+\s*\(\s*['"]([^'"]+)['"]/i) ||
                       body.match(/alert\s*\(\s*['"]([^'"]+)['"]/i)
  return messageMatch?.[1]
}

function extractFailAction(body: string): string {
  if (body.includes('throw')) return 'Throw error and stop execution'
  if (body.includes('return false')) return 'Return false to indicate validation failure'
  if (body.includes('return null')) return 'Return null to indicate no valid result'
  if (body.includes('reject')) return 'Reject the request'
  if (body.includes('status') && body.match(/status.*(?:invalid|error|failed)/i)) {
    return 'Set status to invalid/error'
  }
  if (body.includes('push') && body.match(/error|message/i)) {
    return 'Add error message to list'
  }
  return 'Handle validation failure'
}

function extractStatusFlows(code: string): StatusFlow[] {
  const statusFlows: StatusFlow[] = []
  const foundStatusFields = new Map<string, Set<string>>()
  const transitions: Map<string, StatusTransition[]> = new Map()

  // Pattern 1: Direct status assignments
  const statusAssignPatterns = [
    /(\w+)\s*\[\s*['"]?status['"]?\s*\]\s*=\s*['"](\w+)['"]/gi,
    /(\w+)\.status\s*=\s*['"](\w+)['"]/gi,
    /set\w*Status\s*\(\s*['"]?(\w+)['"]?\s*\)/gi,
    /status\s*[:=]\s*['"](\w+)['"]/gi
  ]

  statusAssignPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const statusValue = match[2] || match[1]
      const field = match[1] ? `${match[1]}.status` : 'status'

      if (!foundStatusFields.has(field)) {
        foundStatusFields.set(field, new Set())
      }
      foundStatusFields.get(field)!.add(statusValue)
    }
  })

  // Pattern 2: Status constants/enums
  const enumPatterns = [
    /(?:STATUS|Status|STATUSES)\s*[:=]\s*\{([^}]+)\}/g,
    /const\s+(?:\w+)?STATUS(?:\w+)?\s*=\s*['"](\w+)['"]/gi
  ]

  enumPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      if (match[1] && match[1].includes(':')) {
        // Object format
        const values = match[1].match(/['"]?(\w+)['"]?\s*:/g)
        values?.forEach(v => {
          const value = v.replace(/['":]/g, '').trim()
          if (!foundStatusFields.has('status')) {
            foundStatusFields.set('status', new Set())
          }
          foundStatusFields.get('status')!.add(value)
        })
      }
    }
  })

  // Pattern 3: Look for if-based transitions
  const transitionPattern = /if\s*\(\s*(?:\w+\.)?status\s*===?\s*['"](\w+)['"]\s*\)[\s\S]*?(?:\w+\.)?status\s*=\s*['"](\w+)['"]/gi
  let match
  while ((match = transitionPattern.exec(code)) !== null) {
    const from = match[1]
    const to = match[2]
    const field = 'status'

    if (!transitions.has(field)) {
      transitions.set(field, [])
    }

    // Get surrounding context for condition explanation
    const startIdx = Math.max(0, match.index - 100)
    const context = code.substring(startIdx, match.index + match[0].length)

    transitions.get(field)!.push({
      from,
      to,
      condition: `status === '${from}'`,
      conditionExplained: `When current status is "${from}", change to "${to}"`,
      action: `Update status from ${from} to ${to}`
    })

    // Ensure both values are in the found set
    if (!foundStatusFields.has(field)) {
      foundStatusFields.set(field, new Set())
    }
    foundStatusFields.get(field)!.add(from)
    foundStatusFields.get(field)!.add(to)
  }

  // Build status flow objects
  foundStatusFields.forEach((values, field) => {
    const statusValues: StatusValue[] = Array.from(values).map(value => ({
      value,
      meaning: inferStatusMeaning(value),
      isTerminal: isTerminalStatus(value),
      triggers: inferStatusTriggers(value, code)
    }))

    statusFlows.push({
      statusField: field,
      possibleValues: statusValues,
      transitions: transitions.get(field) || []
    })
  })

  return statusFlows
}

function inferStatusMeaning(status: string): string {
  const meanings: Record<string, string> = {
    'pending': 'Awaiting review or action',
    'approved': 'Request has been approved and is being processed',
    'rejected': 'Request was denied',
    'cancelled': 'Request was cancelled by the requester',
    'completed': 'Process has been fully completed',
    'in_progress': 'Currently being processed',
    'inprogress': 'Currently being processed',
    'draft': 'Saved but not yet submitted',
    'submitted': 'Submitted and awaiting initial review',
    'active': 'Currently active and in use',
    'inactive': 'Not currently active',
    'expired': 'Has passed its validity period',
    'error': 'An error occurred during processing',
    'failed': 'The process failed to complete',
    'success': 'The process completed successfully',
    'valid': 'Data has been validated',
    'invalid': 'Data failed validation',
    'new': 'Newly created, not yet processed',
    'open': 'Open for action',
    'closed': 'No longer open for action',
    'on_hold': 'Temporarily paused',
    'onhold': 'Temporarily paused',
    'processing': 'Currently being processed by the system'
  }

  const lower = status.toLowerCase().replace(/[-_]/g, '')
  return meanings[lower] || `Status: ${formatVariableName(status)}`
}

function isTerminalStatus(status: string): boolean {
  const terminalStatuses = [
    'approved', 'rejected', 'cancelled', 'completed', 'closed',
    'expired', 'failed', 'success', 'terminated', 'archived'
  ]
  return terminalStatuses.includes(status.toLowerCase())
}

function inferStatusTriggers(status: string, code: string): string[] {
  const triggers: string[] = []
  const lower = status.toLowerCase()

  // Look for what happens when this status is set
  const statusSetRegex = new RegExp(`status\\s*=\\s*['"]${status}['"][\\s\\S]{0,200}`, 'gi')
  const matches = code.match(statusSetRegex)

  if (matches) {
    matches.forEach(m => {
      if (m.includes('sendEmail') || m.includes('GmailApp')) {
        triggers.push('Sends email notification')
      }
      if (m.includes('slack') || m.includes('postMessage')) {
        triggers.push('Sends Slack notification')
      }
      if (m.includes('setValues') || m.includes('setValue')) {
        triggers.push('Updates spreadsheet')
      }
      if (m.includes('UrlFetchApp')) {
        triggers.push('Calls external API')
      }
    })
  }

  return triggers
}

function extractCalculations(code: string): BusinessCalculation[] {
  const calculations: BusinessCalculation[] = []
  let calcId = 1

  // Pattern 1: Explicit calculations with operators
  const calcPatterns = [
    // Basic arithmetic
    {
      regex: /(\w+(?:balance|Balance|total|Total|amount|Amount|days|Days|hours|Hours|count|Count|sum|Sum))\s*=\s*([^;]+[+\-*/][^;]+)/g,
      type: 'arithmetic'
    },
    // Accumulation/reduction
    {
      regex: /(\w+)\s*[+\-*/]=\s*([^;]+)/g,
      type: 'accumulation'
    },
    // Date calculations
    {
      regex: /(\w+(?:date|Date|days|Days))\s*=\s*(?:new Date|Math\.|Date\.)[^;]+/g,
      type: 'date'
    },
    // Percentage calculations
    {
      regex: /(\w+(?:percent|Percent|rate|Rate|ratio|Ratio))\s*=\s*([^;]+[/*][^;]*100[^;]*)/g,
      type: 'percentage'
    }
  ]

  calcPatterns.forEach(pattern => {
    let match
    while ((match = pattern.regex.exec(code)) !== null) {
      const variable = match[1]
      const formula = match[2] || match[0]

      // Skip non-business calculations
      if (!isBusinessVariable(variable) && !formula.match(/balance|amount|days|hours|total|sum|count/i)) {
        continue
      }

      const inputs = extractCalcInputs(formula)
      const lineNumber = code.substring(0, match.index).split('\n').length

      calculations.push({
        id: `C${calcId++}`,
        name: `Calculate ${formatVariableName(variable)}`,
        description: inferCalcDescription(variable, formula),
        formula: formula.trim(),
        formulaExplained: explainFormula(formula),
        inputs: inputs,
        output: formatVariableName(variable),
        example: generateCalcExample(variable, formula),
        codeLocation: `Line ${lineNumber}`
      })
    }
  })

  // Pattern 2: Date difference calculations
  const dateDiffRegex = /(\w+)\s*=\s*(?:\(?\s*(\w+Date|\w+_date|endDate|end_date)\s*-\s*(\w+Date|\w+_date|startDate|start_date)\s*\)?)\s*\/\s*\(?(\d+)/g
  let match
  while ((match = dateDiffRegex.exec(code)) !== null) {
    const variable = match[1]
    const endDate = match[2]
    const startDate = match[3]
    const divisor = match[4]

    let unit = 'milliseconds'
    const divisorNum = parseInt(divisor)
    if (divisorNum === 86400000 || divisorNum === 1000 * 60 * 60 * 24) {
      unit = 'days'
    } else if (divisorNum === 3600000 || divisorNum === 1000 * 60 * 60) {
      unit = 'hours'
    }

    calculations.push({
      id: `C${calcId++}`,
      name: `Calculate ${formatVariableName(variable)}`,
      description: `Calculates the number of ${unit} between ${formatVariableName(startDate)} and ${formatVariableName(endDate)}`,
      formula: match[0],
      formulaExplained: `(${formatVariableName(endDate)} - ${formatVariableName(startDate)}) converted to ${unit}`,
      inputs: [formatVariableName(startDate), formatVariableName(endDate)],
      output: formatVariableName(variable),
      example: `If start is Jan 1 and end is Jan 5, result would be 4 ${unit}`
    })
  }

  // Pattern 3: Business-specific formulas
  const businessFormulas = [
    {
      pattern: /(\w*balance\w*)\s*-\s*(\w*(?:days|amount|requested)\w*)/gi,
      name: 'Balance Deduction',
      description: 'Calculates remaining balance after deducting requested amount'
    },
    {
      pattern: /(\w*(?:salary|pay)\w*)\s*[*/]\s*(\w*(?:days|hours|rate)\w*)/gi,
      name: 'Pay Calculation',
      description: 'Calculates pay based on rate and time worked'
    },
    {
      pattern: /(\w*total\w*)\s*[+]=?\s*(\w*(?:amount|value|sum)\w*)/gi,
      name: 'Running Total',
      description: 'Accumulates values into a running total'
    }
  ]

  businessFormulas.forEach(bf => {
    const matches = Array.from(code.matchAll(bf.pattern))
    for (const m of matches) {
      if (!calculations.some(c => c.formula.includes(m[0]))) {
        calculations.push({
          id: `C${calcId++}`,
          name: bf.name,
          description: bf.description,
          formula: m[0],
          formulaExplained: explainFormula(m[0]),
          inputs: [m[1], m[2]].map(formatVariableName),
          output: formatVariableName(m[1])
        })
      }
    }
  })

  return calculations
}

function extractCalcInputs(formula: string): string[] {
  // Extract variable names from formula
  const vars = formula.match(/[a-zA-Z_]\w*/g) || []
  // Filter out common non-variable words
  const filtered = vars.filter(v =>
    !['new', 'Date', 'Math', 'Number', 'parseInt', 'parseFloat', 'true', 'false', 'null', 'undefined'].includes(v)
  )
  return Array.from(new Set(filtered)).map(formatVariableName)
}

function inferCalcDescription(variable: string, formula: string): string {
  const lower = variable.toLowerCase()
  const formulaLower = formula.toLowerCase()

  if (lower.includes('balance')) {
    if (formulaLower.includes('-')) {
      return 'Calculates remaining balance after deductions'
    }
    if (formulaLower.includes('+')) {
      return 'Calculates total balance including additions'
    }
  }
  if (lower.includes('total') || lower.includes('sum')) {
    return 'Calculates the total/sum of values'
  }
  if (lower.includes('days')) {
    return 'Calculates number of days'
  }
  if (lower.includes('amount')) {
    return 'Calculates a monetary or quantity amount'
  }
  if (lower.includes('percent') || lower.includes('rate')) {
    return 'Calculates a percentage or rate'
  }

  return `Computes ${formatVariableName(variable)} using formula`
}

function explainFormula(formula: string): string {
  let explained = formula
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*-\s*/g, ' minus ')
    .replace(/\s*\*\s*/g, ' multiplied by ')
    .replace(/\s*\/\s*/g, ' divided by ')
    .replace(/\s*%\s*/g, ' modulo ')

  // Clean up variable names in the formula
  explained = explained.replace(/([a-zA-Z_]\w*)/g, (match) => {
    if (['plus', 'minus', 'multiplied', 'divided', 'by', 'modulo'].includes(match)) {
      return match
    }
    return formatVariableName(match)
  })

  return explained
}

function generateCalcExample(variable: string, formula: string): string {
  const lower = variable.toLowerCase()

  if (lower.includes('balance')) {
    return 'If balance is 15 days and request is 3 days, result would be 12 days remaining'
  }
  if (lower.includes('days')) {
    return 'Example: Calculates the number of leave days or working days'
  }
  if (lower.includes('amount') || lower.includes('total')) {
    return 'Example: Sums up individual values to get a total amount'
  }
  if (lower.includes('percent')) {
    return 'Example: If value is 80 out of 100, result would be 80%'
  }

  return undefined as unknown as string
}

function extractDecisionTree(code: string): DecisionNode[] {
  const decisions: DecisionNode[] = []
  let decisionId = 1

  // Find if statements with business logic
  const ifBlockRegex = /if\s*\(([^{]+)\)\s*\{([\s\S]*?)\}(?:\s*else\s+if\s*\(([^{]+)\)\s*\{([\s\S]*?)\})*(?:\s*else\s*\{([\s\S]*?)\})?/g

  let match
  while ((match = ifBlockRegex.exec(code)) !== null) {
    const condition = match[1].trim()
    const ifBody = match[2].trim()
    const elseBody = match[5]?.trim()

    // Only include business logic conditions
    if (!isBusinessLogicCondition(condition)) {
      continue
    }

    const lineNumber = code.substring(0, match.index).split('\n').length
    const trueOutcome = parseDecisionOutcome(ifBody)
    const falseOutcome = elseBody ? parseDecisionOutcome(elseBody) : undefined

    if (trueOutcome) {
      const node: DecisionNode = {
        id: `D${decisionId++}`,
        condition: condition,
        conditionExplained: explainCondition(condition),
        ifTrue: trueOutcome,
        ifFalse: falseOutcome || undefined,
        codeLocation: `Line ${lineNumber}`
      }

      // Look for nested conditions
      const nestedConditions = extractNestedConditions(ifBody, decisionId)
      if (nestedConditions.length > 0) {
        node.nestedConditions = nestedConditions
        decisionId += nestedConditions.length
      }

      decisions.push(node)
    }
  }

  return decisions
}

function parseDecisionOutcome(body: string): DecisionOutcome | null {
  const outcome: DecisionOutcome = {
    action: '',
    actionExplained: ''
  }

  // Check for status updates
  const statusMatch = body.match(/(?:\w+\.)?status\s*=\s*['"](\w+)['"]/i)
  if (statusMatch) {
    outcome.setsStatus = statusMatch[1]
    outcome.action = `Set status to "${statusMatch[1]}"`
  }

  // Check for email notifications
  if (body.includes('sendEmail') || body.includes('GmailApp') || body.includes('MailApp')) {
    outcome.sendsNotification = true
    const recipientMatch = body.match(/(?:to|recipient|email)\s*[:=]\s*['"]?([^'";\n]+)['"]?/i)
    const subjectMatch = body.match(/subject\s*[:=]\s*['"]([^'"]+)['"]/i)
    outcome.notificationDetails = recipientMatch
      ? `Email to: ${recipientMatch[1]}${subjectMatch ? `, Subject: "${subjectMatch[1]}"` : ''}`
      : 'Sends email notification'
  }

  // Check for Slack/messaging
  if (body.includes('slack') || body.includes('postMessage') || body.includes('webhook')) {
    outcome.sendsNotification = true
    outcome.notificationDetails = (outcome.notificationDetails || '') + ' Posts Slack message'
  }

  // Check for data updates
  const updateMatches = body.match(/(\w+)\s*=\s*[^;]+/g) || []
  const dataUpdates: string[] = []
  updateMatches.forEach(u => {
    const varName = u.split('=')[0].trim()
    if (isBusinessVariable(varName)) {
      dataUpdates.push(formatVariableName(varName))
    }
  })
  if (dataUpdates.length > 0) {
    outcome.updatesData = dataUpdates
  }

  // Check for returns
  const returnMatch = body.match(/return\s+([^;]+)/i)
  if (returnMatch) {
    outcome.action = (outcome.action ? outcome.action + ', ' : '') + `Return ${formatValue(returnMatch[1])}`
  }

  // Build action explanation
  const explanations: string[] = []
  if (outcome.setsStatus) {
    explanations.push(`Sets status to "${outcome.setsStatus}"`)
  }
  if (outcome.sendsNotification) {
    explanations.push(outcome.notificationDetails || 'Sends notification')
  }
  if (outcome.updatesData && outcome.updatesData.length > 0) {
    explanations.push(`Updates: ${outcome.updatesData.join(', ')}`)
  }
  if (returnMatch) {
    explanations.push(`Returns ${formatValue(returnMatch[1])}`)
  }

  if (explanations.length === 0) {
    // Try to get a summary of what's in the body
    const actionResult = extractActionFromBody(body)
    if (actionResult) {
      outcome.action = actionResult.summary
      outcome.actionExplained = actionResult.explanation
      return outcome
    }
    return null
  }

  outcome.actionExplained = explanations.join('. ')
  if (!outcome.action) {
    outcome.action = explanations[0]
  }

  return outcome
}

function extractNestedConditions(body: string, startId: number): DecisionNode[] {
  const nested: DecisionNode[] = []
  const nestedIfRegex = /if\s*\(([^)]+)\)\s*\{([^}]*)\}/g

  let match
  let id = startId
  while ((match = nestedIfRegex.exec(body)) !== null) {
    const condition = match[1].trim()
    const nestedBody = match[2].trim()

    if (isBusinessLogicCondition(condition)) {
      const outcome = parseDecisionOutcome(nestedBody)
      if (outcome) {
        nested.push({
          id: `D${id++}`,
          condition,
          conditionExplained: explainCondition(condition),
          ifTrue: outcome
        })
      }
    }
  }

  return nested
}

function extractDataTransformations(code: string): DataTransformation[] {
  const transformations: DataTransformation[] = []
  let transformId = 1

  // Pattern 1: map() transformations
  const mapRegex = /\.map\s*\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>|function\s*\((\w+)\))\s*\{?([\s\S]*?)\}?\s*\)/g
  let match

  while ((match = mapRegex.exec(code)) !== null) {
    const param = match[1] || match[2]
    const body = match[3]

    // Determine what's being mapped
    const returnMatch = body.match(/return\s*\{([^}]+)\}|return\s+([^;]+)/i) ||
                        body.match(/=>\s*\{?([^}]+)\}?/)

    if (returnMatch) {
      const outputFields = returnMatch[1]?.match(/(\w+)\s*:/g)?.map(f => f.replace(':', '').trim()) || []

      if (outputFields.length > 0 || isBusinessLogicCondition(body)) {
        transformations.push({
          id: `T${transformId++}`,
          name: 'Data Mapping Transformation',
          description: `Transforms each ${formatVariableName(param)} into a new format`,
          inputFormat: `Array of ${formatVariableName(param)} objects`,
          outputFormat: outputFields.length > 0
            ? `Objects with: ${outputFields.map(formatVariableName).join(', ')}`
            : 'Transformed data structure',
          businessPurpose: inferTransformPurpose(body, param)
        })
      }
    }
  }

  // Pattern 2: reduce() aggregations
  const reduceRegex = /\.reduce\s*\(\s*(?:\(?\s*(\w+)\s*,\s*(\w+)\s*\)?\s*=>|function\s*\((\w+),\s*(\w+)\))\s*([\s\S]*?),\s*(\{[^}]*\}|0|''|\[\])/g
  while ((match = reduceRegex.exec(code)) !== null) {
    const acc = match[1] || match[3]
    const curr = match[2] || match[4]
    const body = match[5]
    const initial = match[6]

    transformations.push({
      id: `T${transformId++}`,
      name: 'Data Aggregation',
      description: `Aggregates ${formatVariableName(curr)} items into ${formatVariableName(acc)}`,
      inputFormat: 'Array of items',
      outputFormat: initial.startsWith('{') ? 'Aggregated object' :
                    initial.startsWith('[') ? 'Aggregated array' :
                    'Aggregated value',
      businessPurpose: inferAggregatePurpose(body, acc)
    })
  }

  // Pattern 3: filter() operations
  const filterRegex = /\.filter\s*\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>|function\s*\((\w+)\))\s*\{?([\s\S]*?)\}?\s*\)/g
  while ((match = filterRegex.exec(code)) !== null) {
    const param = match[1] || match[2]
    const condition = match[3]

    if (isBusinessLogicCondition(condition)) {
      transformations.push({
        id: `T${transformId++}`,
        name: 'Data Filtering',
        description: `Filters ${formatVariableName(param)} items based on business criteria`,
        inputFormat: `Array of all ${formatVariableName(param)} items`,
        outputFormat: `Array of ${formatVariableName(param)} items matching criteria`,
        businessPurpose: `Selects only items where: ${explainCondition(condition)}`
      })
    }
  }

  // Pattern 4: JSON/object restructuring
  const restructureRegex = /(\w+)\s*=\s*\{\s*(\w+)\s*:\s*(\w+)\.(\w+)/g
  while ((match = restructureRegex.exec(code)) !== null) {
    const target = match[1]
    const source = match[3]

    if (isBusinessVariable(target) || isBusinessVariable(source)) {
      transformations.push({
        id: `T${transformId++}`,
        name: 'Data Restructuring',
        description: `Restructures ${formatVariableName(source)} data into ${formatVariableName(target)} format`,
        inputFormat: `${formatVariableName(source)} object`,
        outputFormat: `${formatVariableName(target)} object`,
        businessPurpose: 'Prepares data for processing or output'
      })
    }
  }

  return transformations
}

function inferTransformPurpose(body: string, param: string): string {
  const lower = body.toLowerCase()

  if (lower.includes('email') || lower.includes('name') || lower.includes('employee')) {
    return 'Extracts and formats employee/user information for display or notification'
  }
  if (lower.includes('date') || lower.includes('format')) {
    return 'Formats dates for proper display or API requirements'
  }
  if (lower.includes('status')) {
    return 'Extracts status information for reporting or processing'
  }
  if (lower.includes('balance') || lower.includes('amount')) {
    return 'Prepares financial/balance data for calculations or display'
  }
  if (lower.includes('row') || lower.includes('sheet')) {
    return 'Transforms spreadsheet data into structured objects'
  }

  return `Transforms ${formatVariableName(param)} data into required format`
}

function inferAggregatePurpose(body: string, accumulator: string): string {
  const lower = body.toLowerCase()

  if (lower.includes('+') || lower.includes('sum') || lower.includes('total')) {
    return 'Calculates total sum of values'
  }
  if (lower.includes('count') || lower.includes('length') || lower.includes('++')) {
    return 'Counts number of items matching criteria'
  }
  if (lower.includes('group') || lower.includes('[') && lower.includes('push')) {
    return 'Groups items by category or key'
  }

  return `Aggregates data into ${formatVariableName(accumulator)}`
}

function generateBusinessRequirements(
  scriptName: string,
  code: string,
  rules: BusinessRule[],
  validations: ValidationCheck[],
  calculations: BusinessCalculation[],
  functions: Array<{ name: string; description?: string | null; isPublic?: boolean }>
): BusinessRequirement[] {
  const requirements: BusinessRequirement[] = []
  let reqId = 1
  const lower = scriptName.toLowerCase()
  const codeLower = code.toLowerCase()

  // Infer main business problem from script name and content
  if (lower.includes('leave') || codeLower.includes('leave request') || codeLower.includes('annual leave')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Leave Request Management',
      description: 'Automates the processing, validation, and approval of employee leave requests',
      category: 'workflow',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('leave') ||
        f.description?.toLowerCase().includes('leave')
      ).map(f => f.name)
    })

    if (validations.some(v => v.field.toLowerCase().includes('balance'))) {
      requirements.push({
        id: `REQ${reqId++}`,
        title: 'Leave Balance Validation',
        description: 'Ensures employees have sufficient leave balance before approving requests',
        category: 'validation',
        relatedFunctions: functions.filter(f =>
          f.name.toLowerCase().includes('valid') ||
          f.name.toLowerCase().includes('balance')
        ).map(f => f.name)
      })
    }

    if (calculations.some(c => c.name.toLowerCase().includes('balance') || c.name.toLowerCase().includes('days'))) {
      requirements.push({
        id: `REQ${reqId++}`,
        title: 'Leave Balance Calculation',
        description: 'Calculates remaining leave balance after requests are approved or encashed',
        category: 'calculation',
        relatedFunctions: functions.filter(f =>
          f.name.toLowerCase().includes('calc') ||
          f.name.toLowerCase().includes('balance')
        ).map(f => f.name)
      })
    }
  }

  if (lower.includes('encash') || codeLower.includes('encash')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Leave Encashment Processing',
      description: 'Handles conversion of unused leave days into monetary compensation',
      category: 'calculation',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('encash')
      ).map(f => f.name)
    })
  }

  if (lower.includes('attendance') || codeLower.includes('attendance') || codeLower.includes('jisr')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Attendance Tracking',
      description: 'Monitors and records employee attendance from HR system integration',
      category: 'integration',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('attend') ||
        f.name.toLowerCase().includes('fetch')
      ).map(f => f.name)
    })
  }

  if (lower.includes('reminder') || lower.includes('notification') || codeLower.includes('sendmail') || codeLower.includes('gmailapp')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Automated Notifications',
      description: 'Sends email notifications to employees, managers, or stakeholders based on business events',
      category: 'notification',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('send') ||
        f.name.toLowerCase().includes('notify') ||
        f.name.toLowerCase().includes('email')
      ).map(f => f.name)
    })
  }

  if (lower.includes('report') || codeLower.includes('report')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Report Generation',
      description: 'Generates business reports with aggregated data and insights',
      category: 'reporting',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('report') ||
        f.name.toLowerCase().includes('generate')
      ).map(f => f.name)
    })
  }

  if (lower.includes('sync') || lower.includes('integration') || codeLower.includes('urlfetchapp')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'External System Integration',
      description: 'Synchronizes data with external systems and APIs',
      category: 'integration',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('fetch') ||
        f.name.toLowerCase().includes('sync') ||
        f.name.toLowerCase().includes('api')
      ).map(f => f.name)
    })
  }

  if (lower.includes('approval') || codeLower.includes('approve') || codeLower.includes('approval')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Approval Workflow',
      description: 'Manages approval chains and processes approval/rejection actions',
      category: 'workflow',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('approv')
      ).map(f => f.name)
    })
  }

  // Add validation requirement if validations exist
  if (validations.length > 0 && !requirements.some(r => r.category === 'validation')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Data Validation',
      description: `Validates ${validations.length} business rules before processing`,
      category: 'validation',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('valid') ||
        f.name.toLowerCase().includes('check')
      ).map(f => f.name)
    })
  }

  // Add calculation requirement if calculations exist
  if (calculations.length > 0 && !requirements.some(r => r.category === 'calculation')) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Business Calculations',
      description: `Performs ${calculations.length} business calculations including: ${calculations.slice(0, 3).map(c => c.name).join(', ')}`,
      category: 'calculation',
      relatedFunctions: functions.filter(f =>
        f.name.toLowerCase().includes('calc') ||
        f.name.toLowerCase().includes('compute')
      ).map(f => f.name)
    })
  }

  // If no requirements found, add a generic one
  if (requirements.length === 0) {
    requirements.push({
      id: `REQ${reqId++}`,
      title: 'Business Process Automation',
      description: 'Automates business processes using Google Workspace integration',
      category: 'workflow',
      relatedFunctions: functions.filter(f => f.isPublic).map(f => f.name)
    })
  }

  return requirements
}
