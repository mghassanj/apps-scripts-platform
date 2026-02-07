import { prisma } from './db'
import { getScriptClient } from './google-auth'
import type { script_v1 } from 'googleapis'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Rate limiting constants
const BATCH_SIZE = 10              // Process 10 scripts at a time
const DELAY_BETWEEN_CALLS_MS = 600 // 600ms between individual API calls
const DELAY_BETWEEN_BATCHES_MS = 3000 // 3s pause between batches

// Helper: sleep for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper: exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const message = error?.message || String(error)
      // Don't retry on auth/permission/not-found errors
      if (message.includes('403') || message.includes('404') || 
          message.includes('invalid argument') || message.includes('forbidden') ||
          message.includes('insufficient authentication')) {
        throw error
      }
      // Retry on rate limit (429) or server errors (5xx)
      if (attempt < maxRetries && (message.includes('429') || message.includes('quota') || message.includes('500') || message.includes('503'))) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500
        console.log(`    Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`)
        await sleep(delay)
        continue
      }
      throw error
    }
  }
  throw lastError
}

export interface ExecutionSyncResult {
  synced: number
  failed: number
  scripts: Array<{
    id: string
    name: string
    executionsFetched: number
    error?: string
  }>
  message?: string
}

// Map Google's process state to our status
function mapProcessState(state: string): 'success' | 'error' | 'warning' {
  switch (state) {
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
    case 'TIMED_OUT':
    case 'UNKNOWN':
      return 'error'
    case 'CANCELED':
      return 'warning'
    default:
      return 'success'
  }
}

// Fetch execution history for a single script using Apps Script API
export async function fetchScriptExecutions(scriptId: string): Promise<{
  executions: Array<{
    functionName: string
    startedAt: Date
    endedAt?: Date
    duration?: number
    status: 'success' | 'error' | 'warning'
    errorMessage?: string
  }>
  error?: string
}> {
  try {
    const scriptClient = getScriptClient()

    // Fetch processes (executions) for this script using listScriptProcesses
    // Wrapped in retry for transient errors (rate limits, server errors)
    const response = await withRetry(() => 
      scriptClient.processes.listScriptProcesses({
        scriptId,
        pageSize: 300, // Get last 300 executions
      })
    )

    const processes = response.data.processes || []

    const executions = processes.map((process: script_v1.Schema$GoogleAppsScriptTypeProcess) => {
      const startTime = process.startTime ? new Date(process.startTime) : new Date()
      // Parse duration string (format: "1.234s") to seconds
      let durationSeconds: number | undefined
      if (process.duration) {
        const durationMatch = process.duration.match(/^([\d.]+)s$/)
        if (durationMatch) {
          durationSeconds = parseFloat(durationMatch[1])
        }
      }
      // Calculate end time from start time + duration
      const endTime = durationSeconds !== undefined
        ? new Date(startTime.getTime() + durationSeconds * 1000)
        : undefined

      return {
        functionName: process.functionName || 'unknown',
        startedAt: startTime,
        endedAt: endTime,
        duration: durationSeconds,
        status: mapProcessState(process.processStatus || 'UNKNOWN'),
        errorMessage: process.processStatus === 'FAILED' ? 'Execution failed' : undefined
      }
    })

    return { executions }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Check for common permission errors
    if (message.includes('403') || message.includes('forbidden')) {
      return {
        executions: [],
        error: 'Permission denied - script may not have execution logging enabled'
      }
    }

    if (message.includes('404')) {
      return {
        executions: [],
        error: 'Script not found or no access'
      }
    }

    return {
      executions: [],
      error: message
    }
  }
}

// Try to fetch logs using clasp CLI (as alternative when API scope is missing)
async function fetchLogsViaClasp(scriptId: string): Promise<{
  executions: Array<{
    functionName: string
    startedAt: Date
    endedAt?: Date
    duration?: number
    status: 'success' | 'error' | 'warning'
    errorMessage?: string
  }>
  error?: string
}> {
  try {
    // Use clasp logs command
    const { stdout } = await execAsync(
      `clasp logs --json --scriptId ${scriptId}`,
      { timeout: 30000 }
    )

    // Parse JSON output from clasp
    const logs = JSON.parse(stdout)

    if (!Array.isArray(logs) || logs.length === 0) {
      return { executions: [] }
    }

    // Transform clasp logs to our execution format
    const executions = logs.slice(0, 50).map((log: {
      severity?: string
      message?: string
      timestamp?: string
    }) => {
      const timestamp = log.timestamp ? new Date(log.timestamp) : new Date()
      const isError = log.severity === 'ERROR'

      return {
        functionName: 'log',
        startedAt: timestamp,
        status: (isError ? 'error' : 'success') as 'success' | 'error',
        errorMessage: isError ? log.message : undefined
      }
    })

    return { executions }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Clasp not available or permission issue
    if (message.includes('clasp') || message.includes('command not found')) {
      return { executions: [], error: 'clasp CLI not available' }
    }

    return { executions: [], error: message }
  }
}

// Validate a script ID exists before trying to fetch executions
async function validateScriptId(scriptId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const scriptClient = getScriptClient()
    await withRetry(() => scriptClient.projects.get({ scriptId }))
    return { valid: true }
  } catch (error: any) {
    const message = error?.message || String(error)
    if (message.includes('404') || message.includes('invalid argument') || message.includes('not found')) {
      return { valid: false, error: 'Script not found or deleted' }
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return { valid: false, error: 'No access to script' }
    }
    // For transient errors, assume valid
    return { valid: true }
  }
}

// Sync execution history for all scripts in the database
export async function syncAllExecutions(): Promise<ExecutionSyncResult> {
  const result: ExecutionSyncResult = {
    synced: 0,
    failed: 0,
    scripts: []
  }

  // Get all scripts from database
  const scripts = await prisma.script.findMany({
    select: { id: true, name: true }
  })

  console.log(`Syncing executions for ${scripts.length} scripts...`)

  let scopeError = false
  const staleScripts: string[] = []

  // Process in batches to avoid rate limiting
  for (let batchStart = 0; batchStart < scripts.length; batchStart += BATCH_SIZE) {
    const batch = scripts.slice(batchStart, batchStart + BATCH_SIZE)
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(scripts.length / BATCH_SIZE)
    console.log(`\n  Batch ${batchNum}/${totalBatches} (${batch.length} scripts)`)

    for (const script of batch) {
      try {
        console.log(`  Fetching executions for: ${script.name}`)

        // First, validate the script ID exists
        const validation = await validateScriptId(script.id)
        if (!validation.valid) {
          console.log(`    STALE: ${validation.error}`)
          staleScripts.push(script.id)
          result.failed++
          result.scripts.push({
            id: script.id,
            name: script.name,
            executionsFetched: 0,
            error: `STALE: ${validation.error}`
          })
          await sleep(DELAY_BETWEEN_CALLS_MS)
          continue
        }

        // Rate limit between calls
        await sleep(DELAY_BETWEEN_CALLS_MS)

        // Try Apps Script API first
        let { executions, error } = await fetchScriptExecutions(script.id)

        // If scope error, note it and try clasp as fallback
        if (error?.includes('insufficient authentication scopes')) {
          scopeError = true
          // Try clasp as alternative
          const claspResult = await fetchLogsViaClasp(script.id)
          if (claspResult.executions.length > 0) {
            executions = claspResult.executions
            error = undefined
          }
        }

        // Mark stale scripts (invalid argument = script ID is wrong/deleted)
        if (error?.includes('invalid argument')) {
          staleScripts.push(script.id)
          console.log(`    STALE: Invalid script ID`)
          result.failed++
          result.scripts.push({
            id: script.id,
            name: script.name,
            executionsFetched: 0,
            error: 'STALE: Invalid script ID'
          })
          continue
        }

        if (error) {
          console.log(`    Error: ${error}`)
          result.failed++
          result.scripts.push({
            id: script.id,
            name: script.name,
            executionsFetched: 0,
            error
          })
          continue
        }

        if (executions.length === 0) {
          console.log(`    No executions found`)
          result.scripts.push({
            id: script.id,
            name: script.name,
            executionsFetched: 0
          })
          continue
        }

        // Store executions in database using batch upsert (avoid N+1 queries)
        let newCount = 0
        const existingExecs = await prisma.execution.findMany({
          where: { scriptId: script.id },
          select: { scriptId: true, startedAt: true, functionName: true }
        })
        const existingSet = new Set(
          existingExecs.map(e => `${e.startedAt.toISOString()}::${e.functionName}`)
        )

        const newExecs = executions.filter(
          exec => !existingSet.has(`${exec.startedAt.toISOString()}::${exec.functionName}`)
        )

        if (newExecs.length > 0) {
          await prisma.execution.createMany({
            data: newExecs.map(exec => ({
              scriptId: script.id,
              functionName: exec.functionName,
              startedAt: exec.startedAt,
              endedAt: exec.endedAt,
              duration: exec.duration,
              status: exec.status,
              errorMessage: exec.errorMessage
            })),
            skipDuplicates: true
          })
          newCount = newExecs.length
        }

        console.log(`    Synced ${newCount} new executions (${executions.length} total fetched)`)
        result.synced++
        result.scripts.push({
          id: script.id,
          name: script.name,
          executionsFetched: newCount
        })
      } catch (error) {
        console.error(`    Failed: ${script.name}`, error)
        result.failed++
        result.scripts.push({
          id: script.id,
          name: script.name,
          executionsFetched: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Pause between batches (except after the last one)
    if (batchStart + BATCH_SIZE < scripts.length) {
      console.log(`  Pausing ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`)
      await sleep(DELAY_BETWEEN_BATCHES_MS)
    }
  }

  console.log(`\nExecution sync complete: ${result.synced} synced, ${result.failed} failed`)

  // Flag stale scripts in the result
  if (staleScripts.length > 0) {
    console.log(`\n⚠️  ${staleScripts.length} stale scripts detected:`)
    staleScripts.forEach(id => console.log(`    - ${id}`))
    result.message = `${staleScripts.length} stale script(s) detected (invalid/deleted). Consider removing them from the database.`
  }

  // Add scope error message if encountered
  if (scopeError) {
    const scopeMsg = 'OAuth scopes insufficient for execution logs. To enable: 1) Run "clasp login --creds" with script.processes scope, or 2) Use the MONITORING_SHEET_ID approach to track executions via a Google Sheet.'
    result.message = result.message ? `${result.message}\n${scopeMsg}` : scopeMsg
  }

  return result
}

// Get execution stats for dashboard
export async function getExecutionStats() {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    total24h,
    success24h,
    error24h,
    total7d,
    success7d
  ] = await Promise.all([
    prisma.execution.count({
      where: { startedAt: { gte: last24h } }
    }),
    prisma.execution.count({
      where: { startedAt: { gte: last24h }, status: 'success' }
    }),
    prisma.execution.count({
      where: { startedAt: { gte: last24h }, status: 'error' }
    }),
    prisma.execution.count({
      where: { startedAt: { gte: last7d } }
    }),
    prisma.execution.count({
      where: { startedAt: { gte: last7d }, status: 'success' }
    })
  ])

  return {
    last24Hours: {
      total: total24h,
      success: success24h,
      error: error24h,
      successRate: total24h > 0 ? Math.round((success24h / total24h) * 100) : 100
    },
    last7Days: {
      total: total7d,
      success: success7d,
      successRate: total7d > 0 ? Math.round((success7d / total7d) * 100) : 100
    }
  }
}
