import { getDriveClient, getScriptClient } from './google-auth'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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
  files: ScriptFile[]
  lastSynced: string
}

export interface ScriptAnalysis {
  scriptId: string
  name: string
  summary: string
  functions: FunctionInfo[]
  externalApis: ApiUsage[]
  googleServices: string[]
  triggers: TriggerInfo[]
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
}

export interface ApiUsage {
  url: string
  method: string
  description: string
  count: number
}

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
  const scriptMap = new Map<string, { id: string; name: string; parentId?: string; source: string }>()

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

  // 3. Try Script API (Note: projects.list is not available in the API, skip this step)
  // The Apps Script API doesn't have a list endpoint, scripts must be discovered via Drive or clasp

  // 4. Try Drive API for standalone scripts
  if (config.autoDiscovery.useDriveApi) {
    try {
      const drive = getDriveClient()
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.script'",
        fields: 'files(id, name, modifiedTime)',
        pageSize: 100,
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
        console.log(`  Found ${files.length} scripts via Drive API`)
      }
    } catch (error: any) {
      console.log('  Drive API script search not available')
    }
  }

  console.log(`  Total unique scripts discovered: ${scriptMap.size}`)
  return Array.from(scriptMap.values())
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

// Note: Container-bound scripts cannot be discovered via API
// They must be discovered via clasp CLI or by providing script IDs in config


// Sync all scripts
export async function syncAllScripts(): Promise<{ synced: number; failed: number; projects: ScriptProject[] }> {
  ensureDirectories()

  const scriptProjects = await getScriptProjects()
  const projects: ScriptProject[] = []
  let synced = 0
  let failed = 0

  for (const scriptProj of scriptProjects) {
    try {
      // Directly fetch content since we now have the script ID
      const files = await fetchScriptContent(scriptProj.id!)

      if (files.length === 0) {
        console.log(`  ⚠ No files found for ${scriptProj.name}`)
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
      console.log(`  ✓ ${scriptProj.name} (${files.length} files)`)
    } catch (error) {
      console.error(`  ✗ Failed to sync ${scriptProj.name}:`, error)
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

// Analyze a script's code
export function analyzeScript(project: ScriptProject): ScriptAnalysis {
  const allCode = project.files
    .filter(f => f.type !== 'JSON')
    .map(f => f.source)
    .join('\n')

  const functions = extractFunctions(allCode)
  const externalApis = extractExternalApis(allCode)
  const googleServices = extractGoogleServices(allCode)
  const triggers = extractTriggers(allCode)
  const dependencies = extractDependencies(allCode)
  const suggestions = generateSuggestions(allCode, functions, externalApis)
  const linesOfCode = allCode.split('\n').length

  const complexity = linesOfCode < 100 ? 'low' : linesOfCode < 500 ? 'medium' : 'high'

  const analysis: ScriptAnalysis = {
    scriptId: project.scriptId,
    name: project.name,
    summary: generateSummary(project.name, functions, externalApis, googleServices),
    functions,
    externalApis,
    googleServices,
    triggers,
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

// Extract function definitions
function extractFunctions(code: string): FunctionInfo[] {
  const functionRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  const functions: FunctionInfo[] = []
  let match

  while ((match = functionRegex.exec(code)) !== null) {
    const name = match[1]
    const params = match[2].split(',').map(p => p.trim()).filter(p => p)

    // Check if it's a public function (no underscore prefix)
    const isPublic = !name.startsWith('_')

    // Try to extract description from JSDoc
    const beforeMatch = code.slice(0, match.index)
    const jsdocMatch = beforeMatch.match(/\/\*\*\s*([\s\S]*?)\*\/\s*$/)
    let description = ''
    if (jsdocMatch) {
      description = jsdocMatch[1]
        .replace(/\s*\*\s*/g, ' ')
        .replace(/@\w+\s+[^\n]*/g, '')
        .trim()
    }

    // Count lines (rough estimate)
    const funcStart = match.index
    let braceCount = 1
    let funcEnd = funcStart + match[0].length
    while (braceCount > 0 && funcEnd < code.length) {
      if (code[funcEnd] === '{') braceCount++
      if (code[funcEnd] === '}') braceCount--
      funcEnd++
    }
    const lineCount = code.slice(funcStart, funcEnd).split('\n').length

    functions.push({
      name,
      description: description || `Function ${name}`,
      parameters: params,
      isPublic,
      lineCount
    })
  }

  return functions
}

// Extract external API calls
function extractExternalApis(code: string): ApiUsage[] {
  const apis: Map<string, ApiUsage> = new Map()

  // UrlFetchApp patterns
  const fetchRegex = /UrlFetchApp\.fetch(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match

  while ((match = fetchRegex.exec(code)) !== null) {
    const url = match[0].includes('fetchAll') ? match[1] : match[1]
    const existing = apis.get(url)

    if (existing) {
      existing.count++
    } else {
      apis.set(url, {
        url: extractBaseUrl(url),
        method: detectHttpMethod(code, match.index),
        description: inferApiDescription(url),
        count: 1
      })
    }
  }

  // Also look for URL variables
  const urlVarRegex = /(?:const|let|var)\s+\w*[Uu]rl\w*\s*=\s*['"`]([^'"`]+)['"`]/g
  while ((match = urlVarRegex.exec(code)) !== null) {
    const url = match[1]
    if (url.startsWith('http') && !apis.has(url)) {
      apis.set(url, {
        url: extractBaseUrl(url),
        method: 'GET',
        description: inferApiDescription(url),
        count: 1
      })
    }
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

// Extract trigger types
function extractTriggers(code: string): TriggerInfo[] {
  const triggers: TriggerInfo[] = []

  // Time-driven trigger setup
  const timeTriggerRegex = /ScriptApp\.newTrigger\s*\(\s*['"`](\w+)['"`]\s*\)[\s\S]*?\.timeBased\(\)[\s\S]*?\.(?:everyHours|everyMinutes|everyDays|at)\s*\(\s*(\d+)?\s*\)/g
  let match

  while ((match = timeTriggerRegex.exec(code)) !== null) {
    triggers.push({
      type: 'time-driven',
      function: match[1],
      schedule: match[0].includes('everyHours') ? 'hourly' :
                match[0].includes('everyMinutes') ? 'minutely' :
                match[0].includes('everyDays') ? 'daily' : 'scheduled'
    })
  }

  // Special function names that are triggers
  const specialTriggers = [
    { pattern: /function\s+onOpen\s*\(/g, type: 'onOpen' },
    { pattern: /function\s+onEdit\s*\(/g, type: 'onEdit' },
    { pattern: /function\s+onInstall\s*\(/g, type: 'onInstall' },
    { pattern: /function\s+onSelectionChange\s*\(/g, type: 'onSelectionChange' },
    { pattern: /function\s+onChange\s*\(/g, type: 'onChange' },
    { pattern: /function\s+onFormSubmit\s*\(/g, type: 'onFormSubmit' },
    { pattern: /function\s+doGet\s*\(/g, type: 'doGet (Web App)' },
    { pattern: /function\s+doPost\s*\(/g, type: 'doPost (Web App)' },
  ]

  for (const { pattern, type } of specialTriggers) {
    if (pattern.test(code)) {
      triggers.push({
        type,
        function: type.split(' ')[0]
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

  // Check for error handling
  if (!code.includes('try') || !code.includes('catch')) {
    suggestions.push('Add try-catch error handling for better reliability')
  }

  // Check for logging
  if (!code.includes('Logger.log') && !code.includes('console.log')) {
    suggestions.push('Add logging for easier debugging')
  }

  // Check for long functions
  const longFunctions = functions.filter(f => f.lineCount > 50)
  if (longFunctions.length > 0) {
    suggestions.push(`Consider breaking down long functions: ${longFunctions.map(f => f.name).join(', ')}`)
  }

  // Check for hardcoded values
  if (code.match(/['"`]\d{10,}['"`]/)) {
    suggestions.push('Move hardcoded IDs to PropertiesService for flexibility')
  }

  // Check for API rate limiting
  if (apis.length > 0 && !code.includes('Utilities.sleep')) {
    suggestions.push('Consider adding rate limiting (Utilities.sleep) for external API calls')
  }

  // Check for caching
  if (apis.length > 0 && !code.includes('CacheService')) {
    suggestions.push('Consider using CacheService to cache external API responses')
  }

  // Check for batch operations
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
  return 'GET'
}

function inferApiDescription(url: string): string {
  if (url.includes('slack')) return 'Slack API'
  if (url.includes('salesforce')) return 'Salesforce API'
  if (url.includes('workable')) return 'Workable API'
  if (url.includes('webhook')) return 'Webhook endpoint'
  if (url.includes('api')) return 'External API'
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
