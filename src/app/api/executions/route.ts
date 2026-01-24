import { NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/google-auth'
import { Execution } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Configuration for execution data fetching
 *
 * Set these environment variables:
 * - MONITORING_SHEET_ID: The ID of the Apps Scripts Execution Log spreadsheet
 * - MONITORING_WEB_APP_URL: The deployed web app URL (optional, for direct API calls)
 * - MONITORING_API_KEY: API key for the web app (optional)
 */
const CONFIG = {
  // The monitoring sheet ID (from the MonitoringScript.js setup)
  SHEET_ID: process.env.MONITORING_SHEET_ID || '',

  // Web app URL for direct API calls (optional alternative to Sheets API)
  WEB_APP_URL: process.env.MONITORING_WEB_APP_URL || '',

  // API key for web app authentication (optional)
  API_KEY: process.env.MONITORING_API_KEY || '',

  // Sheet name containing execution logs
  EXECUTIONS_SHEET: 'Execution Log',

  // Default number of records to return
  DEFAULT_LIMIT: 100,

  // Maximum number of records to return
  MAX_LIMIT: 1000
}

/**
 * Execution record as stored in the Google Sheet
 */
interface SheetExecutionRow {
  id: string
  scriptId: string
  scriptName: string
  functionName: string
  startTime: string
  endTime: string
  duration: number
  status: 'success' | 'error' | 'warning'
  errorMessage: string
  timestamp: string
}

/**
 * Response from the monitoring web app
 */
interface WebAppResponse {
  executions?: SheetExecutionRow[]
  stats?: {
    totalExecutions: number
    successCount: number
    errorCount: number
    warningCount: number
    avgDuration: number
    successRate: number
    uniqueScripts: number
    timeWindow: number
  }
  timestamp: string
  error?: string
}

/**
 * Fetches execution data from the Google Sheet directly using Sheets API
 */
async function fetchFromSheet(
  limit: number,
  status?: string,
  scriptId?: string
): Promise<SheetExecutionRow[]> {
  if (!CONFIG.SHEET_ID) {
    throw new Error(
      'MONITORING_SHEET_ID environment variable not set. ' +
      'Set up the monitoring sheet first using MonitoringScript.js'
    )
  }

  const sheets = getSheetsClient()

  // Get all data from the Execution Log sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SHEET_ID,
    range: `${CONFIG.EXECUTIONS_SHEET}!A2:J`, // Skip header row
  })

  const rows = response.data.values || []

  // Convert rows to objects
  let executions: SheetExecutionRow[] = rows.map((row) => ({
    id: row[0] || '',
    scriptId: row[1] || '',
    scriptName: row[2] || 'Unknown',
    functionName: row[3] || 'unknown',
    startTime: row[4] || '',
    endTime: row[5] || '',
    duration: parseFloat(row[6]) || 0,
    status: (row[7] as 'success' | 'error' | 'warning') || 'success',
    errorMessage: row[8] || '',
    timestamp: row[9] || ''
  }))

  // Apply filters
  if (status) {
    executions = executions.filter((e) => e.status === status)
  }

  if (scriptId) {
    executions = executions.filter((e) => e.scriptId === scriptId)
  }

  // Sort by timestamp descending (most recent first)
  executions.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateB - dateA
  })

  // Apply limit
  return executions.slice(0, limit)
}

/**
 * Fetches execution data from the monitoring web app
 * This is an alternative to direct Sheets API access
 */
async function fetchFromWebApp(
  action: 'list' | 'stats',
  params: Record<string, string>
): Promise<WebAppResponse> {
  if (!CONFIG.WEB_APP_URL) {
    throw new Error(
      'MONITORING_WEB_APP_URL environment variable not set. ' +
      'Deploy the monitoring script as a web app first.'
    )
  }

  const url = new URL(CONFIG.WEB_APP_URL)
  url.searchParams.set('action', action)

  if (CONFIG.API_KEY) {
    url.searchParams.set('apiKey', CONFIG.API_KEY)
  }

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Web app request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Converts sheet execution records to the Execution type used by the app
 */
function toExecution(row: SheetExecutionRow): Execution {
  return {
    id: row.id,
    scriptId: row.scriptId,
    scriptName: row.scriptName,
    function: row.functionName,
    startTime: new Date(row.startTime),
    endTime: new Date(row.endTime),
    duration: row.duration,
    status: row.status,
    message: row.errorMessage || undefined,
    stackTrace: undefined
  }
}

/**
 * Calculates statistics from execution records
 */
function calculateStats(executions: SheetExecutionRow[], hours: number = 24) {
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000

  // Filter to time window
  const recentExecs = executions.filter((e) => {
    const timestamp = new Date(e.timestamp).getTime()
    return timestamp >= cutoffTime
  })

  const totalExecutions = recentExecs.length
  const successCount = recentExecs.filter((e) => e.status === 'success').length
  const errorCount = recentExecs.filter((e) => e.status === 'error').length
  const warningCount = recentExecs.filter((e) => e.status === 'warning').length

  const avgDuration = totalExecutions > 0
    ? recentExecs.reduce((sum, e) => sum + e.duration, 0) / totalExecutions
    : 0

  const successRate = totalExecutions > 0
    ? (successCount / totalExecutions) * 100
    : 0

  const uniqueScripts = new Set(recentExecs.map((e) => e.scriptId)).size

  return {
    totalExecutions,
    successCount,
    errorCount,
    warningCount,
    avgDuration: Math.round(avgDuration * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
    uniqueScripts,
    timeWindow: hours
  }
}

/**
 * GET /api/executions
 *
 * Fetches execution data from either the Google Sheet or the web app endpoint.
 *
 * Query parameters:
 * - source: 'sheet' | 'webapp' (default: 'sheet')
 * - action: 'list' | 'stats' (default: 'list')
 * - limit: number of records to return (default: 100, max: 1000)
 * - status: filter by status ('success' | 'error' | 'warning')
 * - scriptId: filter by script ID
 * - hours: for stats, time window in hours (default: 24)
 *
 * Response for action=list:
 * {
 *   executions: Execution[],
 *   count: number,
 *   timestamp: string
 * }
 *
 * Response for action=stats:
 * {
 *   stats: {
 *     totalExecutions: number,
 *     successCount: number,
 *     errorCount: number,
 *     warningCount: number,
 *     avgDuration: number,
 *     successRate: number,
 *     uniqueScripts: number,
 *     timeWindow: number
 *   },
 *   timestamp: string
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const source = searchParams.get('source') || 'sheet'
    const action = searchParams.get('action') || 'list'
    const limitParam = searchParams.get('limit')
    const status = searchParams.get('status') || undefined
    const scriptId = searchParams.get('scriptId') || undefined
    const hoursParam = searchParams.get('hours')

    const limit = Math.min(
      parseInt(limitParam || String(CONFIG.DEFAULT_LIMIT), 10),
      CONFIG.MAX_LIMIT
    )
    const hours = parseInt(hoursParam || '24', 10)

    // Validate source
    if (source !== 'sheet' && source !== 'webapp') {
      return NextResponse.json(
        { error: 'Invalid source. Use "sheet" or "webapp".' },
        { status: 400 }
      )
    }

    // Validate action
    if (action !== 'list' && action !== 'stats') {
      return NextResponse.json(
        { error: 'Invalid action. Use "list" or "stats".' },
        { status: 400 }
      )
    }

    // Validate status
    if (status && !['success', 'error', 'warning'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use "success", "error", or "warning".' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    if (source === 'webapp') {
      // Fetch from web app
      const webAppResponse = await fetchFromWebApp(action as 'list' | 'stats', {
        limit: String(limit),
        status: status || '',
        scriptId: scriptId || '',
        hours: String(hours)
      })

      if (webAppResponse.error) {
        return NextResponse.json(
          { error: webAppResponse.error },
          { status: 500 }
        )
      }

      if (action === 'stats') {
        return NextResponse.json({
          stats: webAppResponse.stats,
          timestamp
        })
      }

      const executions = (webAppResponse.executions || []).map(toExecution)
      return NextResponse.json({
        executions,
        count: executions.length,
        timestamp
      })
    }

    // Fetch from Google Sheet
    const sheetData = await fetchFromSheet(
      action === 'stats' ? CONFIG.MAX_LIMIT : limit,
      status,
      scriptId
    )

    if (action === 'stats') {
      return NextResponse.json({
        stats: calculateStats(sheetData, hours),
        timestamp
      })
    }

    const executions = sheetData.map(toExecution)
    return NextResponse.json({
      executions,
      count: executions.length,
      timestamp
    })

  } catch (error) {
    console.error('Error fetching executions:', error)

    // Provide helpful error messages
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('MONITORING_SHEET_ID')) {
      return NextResponse.json({
        error: 'Configuration required',
        message: 'Set MONITORING_SHEET_ID environment variable with the ID of your monitoring spreadsheet.',
        setup: 'Run setupMonitoringSheet() in MonitoringScript.js first.'
      }, { status: 500 })
    }

    if (message.includes('MONITORING_WEB_APP_URL')) {
      return NextResponse.json({
        error: 'Configuration required',
        message: 'Set MONITORING_WEB_APP_URL environment variable with your deployed web app URL.',
        setup: 'Deploy MonitoringScript.js as a web app first.'
      }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch executions', details: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/executions/sync
 *
 * Triggers a sync of execution data from the Apps Script API.
 * This calls the web app's sync endpoint.
 *
 * Note: This requires the web app to be deployed and configured.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || 'sync'

    if (action !== 'sync') {
      return NextResponse.json(
        { error: 'Invalid action. Use "sync".' },
        { status: 400 }
      )
    }

    if (!CONFIG.WEB_APP_URL) {
      return NextResponse.json({
        error: 'Configuration required',
        message: 'Set MONITORING_WEB_APP_URL environment variable to use sync.',
        setup: 'Deploy MonitoringScript.js as a web app first.'
      }, { status: 500 })
    }

    const response = await fetchFromWebApp('sync' as 'list', {})

    return NextResponse.json({
      success: true,
      message: 'Sync triggered',
      result: response,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error triggering sync:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sync', details: String(error) },
      { status: 500 }
    )
  }
}
