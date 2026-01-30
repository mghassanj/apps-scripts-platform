import { getDriveClient, getScriptClient } from './google-auth'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type {
  ScriptFile,
  ScriptProject,
  ScriptAnalysis,
  FunctionInfo,
  ApiUsage,
  AnalysisTrigger,
  ExtractedConnectedFile,
  FunctionalSummary
} from '@/types'

const SCRIPTS_DIR = path.join(process.cwd(), 'synced-scripts')
const ANALYSIS_DIR = path.join(process.cwd(), 'script-analysis')
const CONFIG_FILE = path.join(process.cwd(), 'scripts-config.json')

interface ScriptConfig {
  manualScriptIds: Array<{
    scriptId: string
    name: string
    description?: string
    enabled: boolean
  }>
  autoDiscovery: {
    enabled: boolean
    useClasp: boolean
    useScriptApi: boolean
    useDriveApi: boolean
  }
  syncSettings: {
    syncIntervalHours: number
    analyzeAfterSync: boolean
    maxScripts: number
  }
}

// Load configuration
function loadConfig(): ScriptConfig {
  const defaultConfig: ScriptConfig = {
    manualScriptIds: [],
    autoDiscovery: {
      enabled: true,
      useClasp: true,
      useScriptApi: true,
      useDriveApi: true
    },
    syncSettings: {
      syncIntervalHours: 1,
      analyzeAfterSync: true,
      maxScripts: 100
    }
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      return { ...defaultConfig, ...configData }
    }
  } catch (error) {
    console.log('  Warning: Could not load config file, using defaults')
  }

  return defaultConfig
}

// Get scripts from clasp CLI
function getScriptsFromClasp(): Array<{ id: string; name: string }> {
  try {
    const output = execSync('clasp list', { encoding: 'utf-8' })
    const lines = output.split('\n').filter(line => line.includes('script.google.com'))

    return lines.map(line => {
      const match = line.match(/(.+?)\s+-\s+https:\/\/script\.google\.com\/d\/([^\/]+)/)
      if (match) {
        return { name: match[1].trim(), id: match[2] }
      }
      return null
    }).filter(Boolean) as Array<{ id: string; name: string }>
  } catch (error) {
    console.log('  Warning: clasp list failed')
    return []
  }
}

export { ScriptFile, ScriptProject, ScriptAnalysis, FunctionInfo, ApiUsage }

export interface TriggerInfo {
  type: string
  function: string
  schedule?: string
}

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true })
  }
  if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true })
  }
}

// Get all Apps Script projects using multiple discovery methods
export async function getScriptProjects() {
  const config = loadConfig()
  const scriptMap = new Map<string, { id: string; name: string; parentId?: string; parentName?: string; source: string }>()

  // 1. Add manual scripts from config
  for (const manual of config.manualScriptIds) {
    if (manual.enabled && manual.scriptId !== 'YOUR_SCRIPT_ID_HERE') {
      scriptMap.set(manual.scriptId, {
        id: manual.scriptId,
        name: manual.name,
        source: 'config'
      })
    }
  }

  if (!config.autoDiscovery.enabled) {
    console.log(`  Found ${scriptMap.size} scripts from config`)
    return Array.from(scriptMap.values())
  }

  // 2. Try clasp discovery
  if (config.autoDiscovery.useClasp) {
    const claspScripts = getScriptsFromClasp()
    for (const script of claspScripts) {
      if (!scriptMap.has(script.id)) {
        scriptMap.set(script.id, { ...script, source: 'clasp' })
      }
    }
    if (claspScripts.length > 0) {
      console.log(`  Found ${claspScripts.length} scripts via clasp`)
    }
  }

  // 3. Try Drive API for standalone scripts
  if (config.autoDiscovery.useDriveApi) {
    try {
      const drive = getDriveClient()
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        fields: 'files(id, name, modifiedTime)',
        pageSize: 1000,
        orderBy: 'modifiedTime desc'
      })

      const files = response.data.files || []
      for (const f of files) {
        if (f.id && !scriptMap.has(f.id)) {
          scriptMap.set(f.id, {
            id: f.id,
            name: f.name || 'Untitled',
            source: 'drive-api'
          })
        }
      }
      if (files.length > 0) {
        console.log(`  Found ${files.length} standalone scripts via Drive API`)
      }
    } catch (error: unknown) {
      console.log('  Drive API script search not available')
    }
  }

  // 4. Try to discover container-bound scripts from spreadsheets
  if (config.autoDiscovery.useScriptApi) {
    try {
      const boundScripts = await discoverBoundScripts()
      for (const script of boundScripts) {
        if (!scriptMap.has(script.id)) {
          scriptMap.set(script.id, script)
        }
      }
      if (boundScripts.length > 0) {
        console.log(`  Found ${boundScripts.length} container-bound scripts`)
      }
    } catch (error) {
      console.log('  Container-bound script discovery not available')
    }
  }

  console.log(`  Total unique scripts discovered: ${scriptMap.size}`)
  return Array.from(scriptMap.values())
}

// Discover container-bound scripts by checking spreadsheets
async function discoverBoundScripts(): Promise<Array<{ id: string; name: string; parentId: string; parentName: string; source: string }>> {
  const boundScripts: Array<{ id: string; name: string; parentId: string; parentName: string; source: string }> = []

  try {
    const drive = getDriveClient()
    const script = getScriptClient()

    // List spreadsheets owned by user (max 1000 per page)
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and 'me' in owners",
      fields: 'files(id, name)',
      pageSize: 1000,
      orderBy: 'modifiedTime desc'
    })

    const spreadsheets = response.data.files || []
    console.log(`  Checking ${spreadsheets.length} spreadsheets for bound scripts...`)

    // For each spreadsheet, try to get bound script
    for (const sheet of spreadsheets) {
      if (!sheet.id) continue

      try {
        // Try to get script content - this will work if there's a bound script
        // and we have access to it
        const scriptResponse = await script.projects.get({
          scriptId: sheet.id
        })

        if (scriptResponse.data && scriptResponse.data.scriptId) {
          boundScripts.push({
            id: scriptResponse.data.scriptId,
            name: scriptResponse.data.title || sheet.name || 'Bound Script',
            parentId: sheet.id,
            parentName: sheet.name || 'Unknown Spreadsheet',
            source: 'container-bound'
          })
        }
      } catch {
        // No bound script or no access - this is expected for most spreadsheets
      }
    }
  } catch (error) {
    console.log('  Could not search for container-bound scripts')
  }

  return boundScripts
}

// Fetch script content using Apps Script API
export async function fetchScriptContent(scriptId: string): Promise<ScriptFile[]> {
  try {
    const script = getScriptClient()

    const response = await script.projects.getContent({
      scriptId: scriptId
    })

    const files = response.data.files || []

    return files.map(file => ({
      name: file.name || 'unknown',
      type: file.type || 'SERVER_JS',
      source: file.source || '',
      lastModified: new Date().toISOString()
    }))
  } catch (error) {
    // Script may not exist or not be accessible
    return []
  }
}

// Sync all scripts
export async function syncAllScripts(): Promise<{ synced: number; failed: number; projects: ScriptProject[] }> {
  ensureDirectories()

  const scriptProjects = await getScriptProjects()
  const projects: ScriptProject[] = []
  let synced = 0
  let failed = 0

  for (const scriptProj of scriptProjects) {
    try {
      const files = await fetchScriptContent(scriptProj.id!)

      if (files.length === 0) {
        console.log(`  Warning: No files found for ${scriptProj.name}`)
        continue
      }

      const project: ScriptProject = {
        scriptId: scriptProj.id!,
        name: scriptProj.name!,
        parentId: scriptProj.parentId || '',
        parentName: scriptProj.name!,
        files,
        lastSynced: new Date().toISOString()
      }

      // Save to disk
      const projectDir = path.join(SCRIPTS_DIR, sanitizeFileName(scriptProj.name!))
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }

      // Save each file
      for (const file of files) {
        const ext = file.type === 'HTML' ? '.html' : '.js'
        const filePath = path.join(projectDir, `${file.name}${ext}`)
        fs.writeFileSync(filePath, file.source)
      }

      // Save metadata
      const metaPath = path.join(projectDir, '_metadata.json')
      fs.writeFileSync(metaPath, JSON.stringify({
        scriptId: project.scriptId,
        parentId: project.parentId,
        parentName: project.parentName,
        fileCount: files.length,
        lastSynced: project.lastSynced
      }, null, 2))

      projects.push(project)
      synced++
      console.log(`  Synced: ${scriptProj.name} (${files.length} files)`)
    } catch (error) {
      console.error(`  Failed to sync ${scriptProj.name}:`, error)
      failed++
    }
  }

  // Save sync summary
  const summaryPath = path.join(SCRIPTS_DIR, '_sync-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify({
    lastSync: new Date().toISOString(),
    synced,
    failed,
    projects: projects.map(p => ({ name: p.name, scriptId: p.scriptId }))
  }, null, 2))

  return { synced, failed, projects }
}

// ============================================================================
// ENHANCED ANALYSIS FUNCTIONS
// ============================================================================

// Extract connected spreadsheets and files from code
export function extractConnectedFiles(code: string, fileName: string): ExtractedConnectedFile[] {
  const files: ExtractedConnectedFile[] = []
  const seenIds = new Set<string>()
  const lines = code.split('\n')

  // Pattern 1: SpreadsheetApp.openById('ID')
  const openByIdRegex = /SpreadsheetApp\.openById\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g
  let match
  while ((match = openByIdRegex.exec(code)) !== null) {
    const fileId = match[1]
    if (!seenIds.has(fileId)) {
      seenIds.add(fileId)
      const lineNum = getLineNumber(code, match.index)
      files.push({
        fileId,
        fileType: 'spreadsheet',
        accessType: detectAccessType(code, match.index),
        extractedFrom: 'openById',
        codeLocation: `${fileName}:${lineNum}`,
        fileUrl: `https://docs.google.com/spreadsheets/d/${fileId}`
      })
    }
  }

  // Pattern 2: SpreadsheetApp.openByUrl('URL')
  const openByUrlRegex = /SpreadsheetApp\.openByUrl\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
  while ((match = openByUrlRegex.exec(code)) !== null) {
    const url = match[1]
    const fileId = extractIdFromUrl(url)
    if (fileId && !seenIds.has(fileId)) {
      seenIds.add(fileId)
      const lineNum = getLineNumber(code, match.index)
      files.push({
        fileId,
        fileType: 'spreadsheet',
        fileUrl: url,
        accessType: detectAccessType(code, match.index),
        extractedFrom: 'openByUrl',
        codeLocation: `${fileName}:${lineNum}`
      })
    }
  }

  // Pattern 3: DriveApp.getFileById('ID')
  const getFileByIdRegex = /DriveApp\.getFileById\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g
  while ((match = getFileByIdRegex.exec(code)) !== null) {
    const fileId = match[1]
    if (!seenIds.has(fileId)) {
      seenIds.add(fileId)
      const lineNum = getLineNumber(code, match.index)
      files.push({
        fileId,
        fileType: 'drive',
        accessType: detectAccessType(code, match.index),
        extractedFrom: 'getFileById',
        codeLocation: `${fileName}:${lineNum}`,
        fileUrl: `https://drive.google.com/file/d/${fileId}`
      })
    }
  }

  // Pattern 4: DocumentApp.openById('ID')
  const docByIdRegex = /DocumentApp\.openById\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g
  while ((match = docByIdRegex.exec(code)) !== null) {
    const fileId = match[1]
    if (!seenIds.has(fileId)) {
      seenIds.add(fileId)
      const lineNum = getLineNumber(code, match.index)
      files.push({
        fileId,
        fileType: 'document',
        accessType: detectAccessType(code, match.index),
        extractedFrom: 'openById',
        codeLocation: `${fileName}:${lineNum}`,
        fileUrl: `https://docs.google.com/document/d/${fileId}`
      })
    }
  }

  // Pattern 5: Active spreadsheet (container-bound)
  const activeRegex = /SpreadsheetApp\.getActiveSpreadsheet\s*\(\s*\)/g
  if (activeRegex.test(code)) {
    const lineNum = getLineNumber(code, code.indexOf('getActiveSpreadsheet'))
    files.push({
      fileId: 'active',
      fileType: 'spreadsheet',
      fileName: 'Container Spreadsheet',
      accessType: 'read-write',
      extractedFrom: 'active',
      codeLocation: `${fileName}:${lineNum}`
    })
  }

  return files
}

// Get line number from character index
function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length
}

// Extract file ID from Google URL
function extractIdFromUrl(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Detect if code around an index does read or write operations
function detectAccessType(code: string, index: number): 'read' | 'write' | 'read-write' {
  const context = code.slice(index, Math.min(code.length, index + 500))

  const hasRead = /\.getValue|\.getValues|\.getRange|\.getDataRange|\.getSheets|\.getName/.test(context)
  const hasWrite = /\.setValue|\.setValues|\.appendRow|\.insertRow|\.deleteRow|\.clear|\.setBackground/.test(context)

  if (hasRead && hasWrite) return 'read-write'
  if (hasWrite) return 'write'
  return 'read'
}

// Generate functional summary in plain language
export function generateFunctionalSummary(
  name: string,
  functions: FunctionInfo[],
  apis: ApiUsage[],
  services: string[],
  triggers: AnalysisTrigger[],
  connectedFiles: ExtractedConnectedFile[]
): FunctionalSummary {
  // Build trigger phrase
  let triggerPhrase = 'This script runs manually'
  if (triggers.length > 0) {
    const mainTrigger = triggers[0]
    if (mainTrigger.type === 'time-driven') {
      triggerPhrase = `This script runs automatically ${mainTrigger.schedule || 'on a schedule'}`
    } else if (mainTrigger.type === 'onEdit' || mainTrigger.type === 'on-edit') {
      triggerPhrase = 'This script runs when a spreadsheet is edited'
    } else if (mainTrigger.type === 'onOpen' || mainTrigger.type === 'on-open') {
      triggerPhrase = 'This script runs when a document is opened'
    } else if (mainTrigger.type === 'onFormSubmit' || mainTrigger.type === 'on-form-submit') {
      triggerPhrase = 'This script runs when a form is submitted'
    } else if (mainTrigger.type.includes('doGet') || mainTrigger.type.includes('doPost')) {
      triggerPhrase = 'This script runs as a web app'
    }
  }

  // Build action phrase
  const actionParts: string[] = []

  // Identify data sources
  const inputSources: string[] = []
  const outputTargets: string[] = []

  for (const api of apis) {
    const desc = api.description.toLowerCase()
    if (desc.includes('slack')) {
      outputTargets.push('Slack')
      actionParts.push('sends notifications to Slack')
    } else if (desc.includes('jisr') || desc.includes('attendance')) {
      inputSources.push('Jisr HR system')
      actionParts.push('fetches attendance data from Jisr')
    } else if (desc.includes('workable')) {
      inputSources.push('Workable')
      actionParts.push('syncs with Workable recruiting')
    } else if (desc.includes('salesforce')) {
      inputSources.push('Salesforce')
      actionParts.push('integrates with Salesforce')
    } else if (desc.includes('webhook')) {
      outputTargets.push('external webhook')
      actionParts.push('sends data to external webhook')
    } else if (desc.includes('api')) {
      actionParts.push('calls external APIs')
    }
  }

  // Identify Google service actions
  if (services.includes('Sheets')) {
    inputSources.push('Google Sheets')
    if (connectedFiles.some(f => f.fileType === 'spreadsheet')) {
      actionParts.push('reads/writes spreadsheet data')
    }
  }
  if (services.includes('Gmail')) {
    outputTargets.push('Gmail')
    actionParts.push('sends emails')
  }
  if (services.includes('Drive')) {
    actionParts.push('manages Drive files')
  }
  if (services.includes('Calendar')) {
    actionParts.push('manages calendar events')
  }

  // Build workflow steps
  const workflowSteps = buildWorkflowSteps(functions, apis, services, triggers)

  // Build brief summary
  const mainPurpose = inferDetailedPurpose(name, functions, apis, services)
  const actionPhrase = actionParts.length > 0
    ? actionParts.slice(0, 3).join(', ')
    : 'automates spreadsheet operations'

  const brief = `${triggerPhrase} and ${actionPhrase}.`

  // Build detailed description
  let detailed = mainPurpose
  if (connectedFiles.length > 0) {
    const spreadsheets = connectedFiles.filter(f => f.fileType === 'spreadsheet')
    if (spreadsheets.length > 0) {
      detailed += ` It works with ${spreadsheets.length} spreadsheet${spreadsheets.length > 1 ? 's' : ''}.`
    }
  }
  if (apis.length > 0) {
    detailed += ` Integrates with ${apis.length} external API${apis.length > 1 ? 's' : ''}.`
  }

  return {
    brief,
    detailed,
    workflowSteps,
    inputSources: [...new Set(inputSources)],
    outputTargets: [...new Set(outputTargets)]
  }
}

// Build workflow steps from analysis
function buildWorkflowSteps(
  functions: FunctionInfo[],
  apis: ApiUsage[],
  services: string[],
  triggers: AnalysisTrigger[]
): string[] {
  const steps: string[] = []

  // Step 1: Trigger
  if (triggers.length > 0) {
    const trigger = triggers[0]
    if (trigger.type === 'time-driven') {
      steps.push(`Runs automatically ${trigger.schedule || 'on schedule'}`)
    } else if (trigger.type.includes('Edit')) {
      steps.push('Triggered when spreadsheet is edited')
    } else if (trigger.type.includes('Open')) {
      steps.push('Runs when document is opened')
    } else if (trigger.type.includes('Form')) {
      steps.push('Triggered on form submission')
    } else {
      steps.push('Runs manually or via trigger')
    }
  } else {
    steps.push('Run manually by user')
  }

  // Step 2: Data gathering
  const dataSources: string[] = []
  for (const api of apis) {
    if (api.method === 'GET' || api.description.toLowerCase().includes('fetch')) {
      dataSources.push(api.description)
    }
  }
  if (services.includes('Sheets')) {
    dataSources.push('spreadsheet data')
  }
  if (dataSources.length > 0) {
    steps.push(`Fetches data from ${dataSources.slice(0, 2).join(' and ')}`)
  }

  // Step 3: Processing
  const mainFunc = functions.find(f => f.isPublic && f.lineCount > 10)
  if (mainFunc) {
    steps.push(`Processes data using ${mainFunc.name}()`)
  } else if (functions.length > 0) {
    steps.push('Processes and transforms the data')
  }

  // Step 4: Output
  const outputs: string[] = []
  for (const api of apis) {
    if (api.method === 'POST' || api.description.toLowerCase().includes('send')) {
      outputs.push(api.description)
    }
  }
  if (services.includes('Gmail')) {
    outputs.push('email')
  }
  if (services.includes('Sheets')) {
    outputs.push('spreadsheet')
  }
  if (outputs.length > 0) {
    steps.push(`Outputs results to ${outputs.slice(0, 2).join(' and ')}`)
  }

  return steps
}

// Infer detailed purpose from name and analysis
function inferDetailedPurpose(
  name: string,
  functions: FunctionInfo[],
  apis: ApiUsage[],
  services: string[]
): string {
  const lower = name.toLowerCase()
  const funcNames = functions.map(f => f.name.toLowerCase()).join(' ')
  const apiDescs = apis.map(a => a.description.toLowerCase()).join(' ')

  // Check for attendance tracking
  if (lower.includes('attendance') || funcNames.includes('attendance') || apiDescs.includes('jisr')) {
    return 'Automates attendance tracking and employee time management'
  }

  // Check for recruiting/hiring
  if (lower.includes('workable') || lower.includes('recruit') || apiDescs.includes('workable')) {
    return 'Manages recruiting pipeline and candidate data from Workable'
  }

  // Check for notifications
  if (lower.includes('reminder') || lower.includes('notification') || apiDescs.includes('slack')) {
    return 'Sends automated notifications and reminders'
  }

  // Check for data sync
  if (lower.includes('sync') || lower.includes('integration')) {
    return 'Synchronizes data between multiple systems'
  }

  // Check for reports
  if (lower.includes('report') || lower.includes('dashboard')) {
    return 'Generates reports and dashboard data'
  }

  // Check for document generation
  if (lower.includes('generator') || lower.includes('template')) {
    return 'Generates documents from templates'
  }

  // Default based on services
  if (services.includes('Gmail')) {
    return 'Automates email workflows'
  }
  if (services.includes('Calendar')) {
    return 'Manages calendar events and scheduling'
  }
  if (services.includes('Sheets')) {
    return 'Automates spreadsheet operations and data processing'
  }

  return 'Automates Google Workspace tasks'
}

// ============================================================================
// ORIGINAL ANALYSIS FUNCTIONS (ENHANCED)
// ============================================================================

// Analyze a script's code
export function analyzeScript(project: ScriptProject): ScriptAnalysis {
  const allCode = project.files
    .filter(f => f.type !== 'JSON')
    .map(f => f.source)
    .join('\n')

  const functions = extractFunctions(allCode, project.files)
  const externalApis = extractExternalApis(allCode)
  const googleServices = extractGoogleServices(allCode)
  const triggers = extractTriggers(allCode)
  const dependencies = extractDependencies(allCode)
  const suggestions = generateSuggestions(allCode, functions, externalApis)
  const linesOfCode = allCode.split('\n').length

  // NEW: Extract connected files from all script files
  const connectedSpreadsheets: ExtractedConnectedFile[] = []
  for (const file of project.files) {
    if (file.type !== 'JSON') {
      const extracted = extractConnectedFiles(file.source, file.name)
      connectedSpreadsheets.push(...extracted)
    }
  }

  // NEW: Generate functional summary
  const functionalSummary = generateFunctionalSummary(
    project.name,
    functions,
    externalApis,
    googleServices,
    triggers,
    connectedSpreadsheets
  )

  const complexity = linesOfCode < 100 ? 'low' : linesOfCode < 500 ? 'medium' : 'high'

  const analysis: ScriptAnalysis = {
    scriptId: project.scriptId,
    name: project.name,
    summary: generateSummary(project.name, functions, externalApis, googleServices),
    functionalSummary,
    functions,
    externalApis,
    googleServices,
    triggers,
    connectedSpreadsheets,
    dependencies,
    suggestions,
    complexity,
    linesOfCode,
    lastAnalyzed: new Date().toISOString()
  }

  // Save analysis
  ensureDirectories()
  const analysisPath = path.join(ANALYSIS_DIR, `${sanitizeFileName(project.name)}.json`)
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))

  return analysis
}

// Extract function definitions (enhanced with file tracking)
function extractFunctions(code: string, files?: ScriptFile[]): FunctionInfo[] {
  const functionRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  const allFunctions: FunctionInfo[] = []

  // If we have files, process each separately to track file names
  if (files) {
    for (const file of files) {
      if (file.type === 'JSON') continue

      const fileCode = file.source
      let match

      while ((match = functionRegex.exec(fileCode)) !== null) {
        const funcInfo = extractSingleFunction(fileCode, match, file.name)
        allFunctions.push(funcInfo)
      }
      functionRegex.lastIndex = 0 // Reset regex
    }
  } else {
    let match
    while ((match = functionRegex.exec(code)) !== null) {
      const funcInfo = extractSingleFunction(code, match)
      allFunctions.push(funcInfo)
    }
  }

  return allFunctions
}

function extractSingleFunction(code: string, match: RegExpExecArray, fileName?: string): FunctionInfo {
  const name = match[1]
  const params = match[2].split(',').map(p => p.trim()).filter(p => p)
  const isPublic = !name.startsWith('_')

  // Extract JSDoc description
  const beforeMatch = code.slice(0, match.index)
  const jsdocMatch = beforeMatch.match(/\/\*\*\s*([\s\S]*?)\*\/\s*$/)
  let description = ''
  if (jsdocMatch) {
    description = jsdocMatch[1]
      .replace(/\s*\*\s*/g, ' ')
      .replace(/@\w+\s+[^\n]*/g, '')
      .trim()
  }

  // Count lines
  const funcStart = match.index
  let braceCount = 1
  let funcEnd = funcStart + match[0].length
  while (braceCount > 0 && funcEnd < code.length) {
    if (code[funcEnd] === '{') braceCount++
    if (code[funcEnd] === '}') braceCount--
    funcEnd++
  }
  const lineCount = code.slice(funcStart, funcEnd).split('\n').length

  return {
    name,
    description: description || `Function ${name}`,
    parameters: params,
    isPublic,
    lineCount,
    fileName
  }
}

// Extract external API calls (enhanced with code location)
// NOTE: Uses composite key (baseUrl + method) to avoid duplicate constraint violations
function extractExternalApis(code: string): ApiUsage[] {
  const apis: Map<string, ApiUsage> = new Map()

  // Helper to create composite key for deduplication
  const makeKey = (url: string, method: string) => `${extractBaseUrl(url)}::${method}`

  // UrlFetchApp patterns with hardcoded URLs
  const fetchRegex = /UrlFetchApp\.fetch(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match

  while ((match = fetchRegex.exec(code)) !== null) {
    const url = match[1]
    const method = detectHttpMethod(code, match.index)
    const baseUrl = extractBaseUrl(url)
    const key = makeKey(url, method)
    const lineNum = getLineNumber(code, match.index)
    const existing = apis.get(key)

    if (existing) {
      existing.count++
    } else {
      apis.set(key, {
        url: baseUrl,
        method,
        description: inferApiDescription(url),
        count: 1,
        codeLocation: `line ${lineNum}`
      })
    }
  }

  // Look for URL variables (const someUrl = 'http...')
  const urlVarRegex = /(?:const|let|var)\s+\w*[Uu]rl\w*\s*=\s*['"`]([^'"`]+)['"`]/g
  while ((match = urlVarRegex.exec(code)) !== null) {
    const url = match[1]
    const method = 'GET'
    const key = makeKey(url, method)
    if (url.startsWith('http') && !apis.has(key)) {
      const lineNum = getLineNumber(code, match.index)
      apis.set(key, {
        url: extractBaseUrl(url),
        method,
        description: inferApiDescription(url),
        count: 1,
        codeLocation: `line ${lineNum}`
      })
    }
  }

  // Look for BASE_URL, API_URL, ENDPOINT patterns in config objects
  const configUrlRegex = /(?:BASE_URL|API_URL|ENDPOINT|baseUrl|apiUrl|endpoint|api_url|base_url)\s*[:=]\s*['"`](https?:\/\/[^'"`]+)['"`]/gi
  while ((match = configUrlRegex.exec(code)) !== null) {
    const url = match[1]
    const method = 'GET'
    const key = makeKey(url, method)
    if (!apis.has(key)) {
      const lineNum = getLineNumber(code, match.index)
      apis.set(key, {
        url: extractBaseUrl(url),
        method,
        description: inferApiDescription(url),
        count: 1,
        codeLocation: `line ${lineNum}`
      })
    }
  }

  // Look for any https:// URLs that look like API endpoints (not Google domains)
  const genericUrlRegex = /['"`](https?:\/\/(?!(?:docs|drive|sheets|script|www)\.google\.com)[a-zA-Z0-9][a-zA-Z0-9\-._]*\.[a-zA-Z]{2,}[\/a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]*)['"`]/g
  while ((match = genericUrlRegex.exec(code)) !== null) {
    const url = match[1]
    // Skip if it's clearly not an API (images, cdn, etc.)
    if (/\.(png|jpg|jpeg|gif|svg|css|js|ico|woff|ttf)$/i.test(url)) continue
    
    const method = 'GET'
    const key = makeKey(url, method)
    if (apis.has(key)) continue

    const lineNum = getLineNumber(code, match.index)
    apis.set(key, {
      url: extractBaseUrl(url),
      method,
      description: inferApiDescription(url),
      count: 1,
      codeLocation: `line ${lineNum}`
    })
  }

  return Array.from(apis.values())
}

// Extract Google services used
function extractGoogleServices(code: string): string[] {
  const services = new Set<string>()

  const servicePatterns = [
    { pattern: /SpreadsheetApp/g, name: 'Sheets' },
    { pattern: /DriveApp/g, name: 'Drive' },
    { pattern: /GmailApp/g, name: 'Gmail' },
    { pattern: /CalendarApp/g, name: 'Calendar' },
    { pattern: /DocumentApp/g, name: 'Docs' },
    { pattern: /SlidesApp/g, name: 'Slides' },
    { pattern: /FormApp/g, name: 'Forms' },
    { pattern: /ContactsApp/g, name: 'Contacts' },
    { pattern: /UrlFetchApp/g, name: 'URL Fetch' },
    { pattern: /CacheService/g, name: 'Cache' },
    { pattern: /PropertiesService/g, name: 'Properties' },
    { pattern: /ScriptApp/g, name: 'Script' },
    { pattern: /HtmlService/g, name: 'HTML' },
    { pattern: /ContentService/g, name: 'Content' },
    { pattern: /LockService/g, name: 'Lock' },
    { pattern: /Logger/g, name: 'Logger' },
    { pattern: /Utilities/g, name: 'Utilities' },
    { pattern: /CardService/g, name: 'Cards' },
    { pattern: /Charts/g, name: 'Charts' },
  ]

  for (const { pattern, name } of servicePatterns) {
    if (pattern.test(code)) {
      services.add(name)
    }
  }

  return Array.from(services)
}

// Extract triggers (enhanced with schedule descriptions)
function extractTriggers(code: string): AnalysisTrigger[] {
  const triggers: AnalysisTrigger[] = []

  // Time-driven trigger setup (programmatic)
  const timeTriggerRegex = /ScriptApp\.newTrigger\s*\(\s*['"`](\w+)['"`]\s*\)[\s\S]*?\.timeBased\(\)[\s\S]*?\.(everyHours|everyMinutes|everyDays|at|onWeekDay)\s*\(\s*(\d+)?\s*\)/g
  let match

  while ((match = timeTriggerRegex.exec(code)) !== null) {
    const funcName = match[1]
    const scheduleType = match[2]
    const value = match[3]

    let schedule = 'scheduled'
    let scheduleDescription = ''

    if (scheduleType === 'everyHours') {
      schedule = `every ${value || 1} hour${value && parseInt(value) > 1 ? 's' : ''}`
      scheduleDescription = `Runs every ${value || 1} hour${value && parseInt(value) > 1 ? 's' : ''}`
    } else if (scheduleType === 'everyMinutes') {
      schedule = `every ${value || 1} minute${value && parseInt(value) > 1 ? 's' : ''}`
      scheduleDescription = `Runs every ${value || 1} minute${value && parseInt(value) > 1 ? 's' : ''}`
    } else if (scheduleType === 'everyDays') {
      schedule = `daily`
      scheduleDescription = 'Runs daily'
    } else if (scheduleType === 'at') {
      schedule = `at specific time`
      scheduleDescription = 'Runs at a specific time'
    }

    triggers.push({
      type: 'time-driven',
      function: funcName,
      schedule,
      scheduleDescription,
      isProgrammatic: true
    })
  }

  // Special function names that are triggers
  const specialTriggers = [
    { pattern: /function\s+onOpen\s*\(/g, type: 'on-open', event: 'spreadsheet' },
    { pattern: /function\s+onEdit\s*\(/g, type: 'on-edit', event: 'spreadsheet' },
    { pattern: /function\s+onInstall\s*\(/g, type: 'on-install', event: 'addon' },
    { pattern: /function\s+onSelectionChange\s*\(/g, type: 'on-selection-change', event: 'spreadsheet' },
    { pattern: /function\s+onChange\s*\(/g, type: 'on-change', event: 'spreadsheet' },
    { pattern: /function\s+onFormSubmit\s*\(/g, type: 'on-form-submit', event: 'form' },
    { pattern: /function\s+doGet\s*\(/g, type: 'web-app-get', event: 'http' },
    { pattern: /function\s+doPost\s*\(/g, type: 'web-app-post', event: 'http' },
  ]

  for (const { pattern, type, event } of specialTriggers) {
    if (pattern.test(code)) {
      triggers.push({
        type,
        function: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
        sourceEvent: event
      })
    }
  }

  return triggers
}

// Extract dependencies
function extractDependencies(code: string): string[] {
  const deps = new Set<string>()

  // Library IDs in the code
  const libRegex = /['"`]([A-Za-z0-9_-]{30,})['"`]/g
  let match
  while ((match = libRegex.exec(code)) !== null) {
    if (match[1].length > 30) {
      deps.add(`Library: ${match[1].slice(0, 20)}...`)
    }
  }

  // External URLs as dependencies
  const urlRegex = /['"`](https?:\/\/[^'"`]+)['"`]/g
  while ((match = urlRegex.exec(code)) !== null) {
    const domain = extractDomain(match[1])
    if (domain && !domain.includes('google')) {
      deps.add(`API: ${domain}`)
    }
  }

  return Array.from(deps)
}

// Generate improvement suggestions
function generateSuggestions(code: string, functions: FunctionInfo[], apis: ApiUsage[]): string[] {
  const suggestions: string[] = []

  if (!code.includes('try') || !code.includes('catch')) {
    suggestions.push('Add try-catch error handling for better reliability')
  }

  if (!code.includes('Logger.log') && !code.includes('console.log')) {
    suggestions.push('Add logging for easier debugging')
  }

  const longFunctions = functions.filter(f => f.lineCount > 50)
  if (longFunctions.length > 0) {
    suggestions.push(`Consider breaking down long functions: ${longFunctions.map(f => f.name).join(', ')}`)
  }

  if (code.match(/['"`]\d{10,}['"`]/)) {
    suggestions.push('Move hardcoded IDs to PropertiesService for flexibility')
  }

  if (apis.length > 0 && !code.includes('Utilities.sleep')) {
    suggestions.push('Consider adding rate limiting (Utilities.sleep) for external API calls')
  }

  if (apis.length > 0 && !code.includes('CacheService')) {
    suggestions.push('Consider using CacheService to cache external API responses')
  }

  if (code.match(/\.getRange\([^)]+\)\.getValue\(\)/g)) {
    suggestions.push('Use getValues() for batch reads instead of individual getValue() calls')
  }

  return suggestions
}

// Generate a summary
function generateSummary(name: string, functions: FunctionInfo[], apis: ApiUsage[], services: string[]): string {
  const mainPurpose = inferPurpose(name)
  const funcCount = functions.length
  const apiCount = apis.length
  const serviceList = services.slice(0, 3).join(', ')

  return `${mainPurpose}. Contains ${funcCount} functions${apiCount > 0 ? ` with ${apiCount} external API integration${apiCount > 1 ? 's' : ''}` : ''}. Uses Google ${serviceList}${services.length > 3 ? ` and ${services.length - 3} more services` : ''}.`
}

// Helper functions
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)
}

function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.split('/').slice(0, 3).join('/')}`
  } catch {
    return url.slice(0, 50)
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

function detectHttpMethod(code: string, index: number): string {
  const context = code.slice(Math.max(0, index - 200), index + 200)
  if (context.includes("'method': 'POST'") || context.includes('"method": "POST"')) return 'POST'
  if (context.includes("'method': 'PUT'") || context.includes('"method": "PUT"')) return 'PUT'
  if (context.includes("'method': 'DELETE'") || context.includes('"method": "DELETE"')) return 'DELETE'
  if (context.includes("'method': 'PATCH'") || context.includes('"method": "PATCH"')) return 'PATCH'
  return 'GET'
}

function inferApiDescription(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('slack')) return 'Slack API'
  if (lower.includes('salesforce')) return 'Salesforce API'
  if (lower.includes('workable')) return 'Workable API'
  if (lower.includes('jisr') || lower.includes('attendance')) return 'Jisr HR API'
  if (lower.includes('webhook')) return 'Webhook endpoint'
  if (lower.includes('notion')) return 'Notion API'
  if (lower.includes('airtable')) return 'Airtable API'
  if (lower.includes('hubspot')) return 'HubSpot API'
  if (lower.includes('stripe')) return 'Stripe API'
  if (lower.includes('twilio')) return 'Twilio API'
  if (lower.includes('sendgrid')) return 'SendGrid API'
  if (lower.includes('api')) return 'External API'
  return 'HTTP request'
}

function inferPurpose(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('attendance')) return 'Manages attendance tracking and reminders'
  if (lower.includes('integration')) return 'Handles third-party integration'
  if (lower.includes('reminder')) return 'Sends automated reminders'
  if (lower.includes('generator')) return 'Generates documents or reports'
  if (lower.includes('sync')) return 'Synchronizes data between systems'
  if (lower.includes('import')) return 'Imports data from external sources'
  if (lower.includes('export')) return 'Exports data to external systems'
  if (lower.includes('report')) return 'Generates reports'
  if (lower.includes('notification')) return 'Sends notifications'
  if (lower.includes('backup')) return 'Handles data backup'
  return 'Automates spreadsheet operations'
}

// Get all analyses
export function getAllAnalyses(): ScriptAnalysis[] {
  ensureDirectories()

  const files = fs.readdirSync(ANALYSIS_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const content = fs.readFileSync(path.join(ANALYSIS_DIR, f), 'utf-8')
    return JSON.parse(content)
  })
}

// Get sync status
export function getSyncStatus(): { lastSync: string; synced: number; failed: number } | null {
  const summaryPath = path.join(SCRIPTS_DIR, '_sync-summary.json')
  if (!fs.existsSync(summaryPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
}

// Export helper for database operations
export { sanitizeFileName, extractBaseUrl, extractDomain, inferApiDescription }
