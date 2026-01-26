import { getScriptClient, getDriveClient } from './google-auth'
import fs from 'fs'
import path from 'path'

const SCRIPTS_CONFIG_FILE = path.join(process.cwd(), 'scripts-to-sync.json')

export interface DiscoveredScript {
  name: string
  status: 'known' | 'new' | 'addon'
  scriptId?: string
  parentSpreadsheet?: {
    id: string
    name: string
    url: string
  }
  lastExecution?: {
    function: string
    status: string
    time: string
  }
}

export interface DiscoveryResult {
  total: number
  known: number
  new: number
  addons: number
  scripts: DiscoveredScript[]
  timestamp: string
}

// Known third-party add-ons to filter out
const KNOWN_ADDONS = [
  'GPT for Sheets and Docs',
  'Apipheny',
  'API Connector',
  'Power Tools',
  'Split Names',
  'Extract URLs',
  'Remove Duplicates',
  'Supermetrics',
  'Coupler.io',
  'Sheetgo',
  'autocrat',
  'Form Publisher',
  'Yet Another Mail Merge',
  'Mail Merge with Attachments',
]

// Load known scripts from config file
function loadKnownScripts(): Map<string, string> {
  const knownByName = new Map<string, string>()

  try {
    if (fs.existsSync(SCRIPTS_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCRIPTS_CONFIG_FILE, 'utf-8'))
      for (const script of data.scripts || []) {
        knownByName.set(script.name, script.id)
      }
    }
  } catch (error) {
    console.error('Error loading scripts config:', error)
  }

  return knownByName
}

// Save a new script to the config file
export async function addScriptToConfig(scriptId: string, name: string): Promise<boolean> {
  try {
    let data = { scripts: [] as Array<{ id: string; name: string }> }

    if (fs.existsSync(SCRIPTS_CONFIG_FILE)) {
      data = JSON.parse(fs.readFileSync(SCRIPTS_CONFIG_FILE, 'utf-8'))
    }

    // Check if already exists
    const exists = data.scripts.some(s => s.id === scriptId || s.name === name)
    if (exists) {
      return false
    }

    data.scripts.push({ id: scriptId, name })
    data.scripts.sort((a, b) => a.name.localeCompare(b.name))

    fs.writeFileSync(SCRIPTS_CONFIG_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Error adding script to config:', error)
    return false
  }
}

// Check if a script name looks like an add-on
function isLikelyAddon(name: string): boolean {
  const lowerName = name.toLowerCase()

  // Check against known add-ons
  for (const addon of KNOWN_ADDONS) {
    if (lowerName.includes(addon.toLowerCase())) {
      return true
    }
  }

  // Heuristics for add-on detection
  if (lowerName.includes('add-on') || lowerName.includes('addon')) return true
  if (lowerName.includes('plugin')) return true
  if (lowerName.includes('extension')) return true

  return false
}

// Search Drive for a spreadsheet by name
async function findSpreadsheetByName(name: string): Promise<{ id: string; name: string; url: string } | null> {
  try {
    const drive = getDriveClient()

    // Try exact match first
    const exactResponse = await drive.files.list({
      q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name, webViewLink)',
      pageSize: 5
    })

    const exactFiles = exactResponse.data.files || []
    if (exactFiles.length > 0) {
      const f = exactFiles[0]
      return {
        id: f.id!,
        name: f.name!,
        url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`
      }
    }

    // Try partial match
    const partialResponse = await drive.files.list({
      q: `name contains '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name, webViewLink)',
      pageSize: 5
    })

    const partialFiles = partialResponse.data.files || []
    if (partialFiles.length > 0) {
      const f = partialFiles[0]
      return {
        id: f.id!,
        name: f.name!,
        url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`
      }
    }

    return null
  } catch (error) {
    console.error(`Error searching for spreadsheet "${name}":`, error)
    return null
  }
}

// Main discovery function
export async function discoverScripts(): Promise<DiscoveryResult> {
  const script = getScriptClient()
  const knownScripts = loadKnownScripts()

  console.log('Starting script discovery...')
  console.log(`Known scripts in config: ${knownScripts.size}`)

  // Collect all unique scripts from processes API
  const scriptExecutions = new Map<string, { function: string; status: string; time: string }>()
  let pageToken: string | undefined
  let pageCount = 0

  do {
    const response = await script.processes.list({
      pageSize: 50,
      pageToken
    })

    const processes = response.data.processes || []
    for (const p of processes) {
      if (p.projectName && !scriptExecutions.has(p.projectName)) {
        scriptExecutions.set(p.projectName, {
          function: p.functionName || 'unknown',
          status: p.processStatus || 'unknown',
          time: p.startTime || ''
        })
      }
    }

    pageToken = response.data.nextPageToken
    pageCount++

    // Limit to avoid timeout
    if (pageCount > 30) break
  } while (pageToken)

  console.log(`Found ${scriptExecutions.size} unique scripts from execution history`)

  // Categorize scripts
  const result: DiscoveryResult = {
    total: scriptExecutions.size,
    known: 0,
    new: 0,
    addons: 0,
    scripts: [],
    timestamp: new Date().toISOString()
  }

  for (const [name, execution] of scriptExecutions) {
    const discovered: DiscoveredScript = {
      name,
      status: 'new',
      lastExecution: execution
    }

    // Check if known
    if (knownScripts.has(name)) {
      discovered.status = 'known'
      discovered.scriptId = knownScripts.get(name)
      result.known++
    }
    // Check if likely an add-on
    else if (isLikelyAddon(name)) {
      discovered.status = 'addon'
      result.addons++
    }
    // New script - try to find its parent spreadsheet
    else {
      discovered.status = 'new'
      result.new++

      // Search for parent spreadsheet
      const spreadsheet = await findSpreadsheetByName(name)
      if (spreadsheet) {
        discovered.parentSpreadsheet = spreadsheet
      }
    }

    result.scripts.push(discovered)
  }

  // Sort: new first, then known, then addons
  result.scripts.sort((a, b) => {
    const order = { new: 0, known: 1, addon: 2 }
    return order[a.status] - order[b.status] || a.name.localeCompare(b.name)
  })

  console.log(`Discovery complete: ${result.known} known, ${result.new} new, ${result.addons} add-ons`)

  return result
}

// Verify a script ID is valid and get its details
export async function verifyScriptId(scriptId: string): Promise<{
  valid: boolean
  name?: string
  parentId?: string
  error?: string
}> {
  try {
    const script = getScriptClient()

    const response = await script.projects.get({
      scriptId
    })

    return {
      valid: true,
      name: response.data.title || undefined,
      parentId: response.data.parentId || undefined
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid script ID'
    }
  }
}
