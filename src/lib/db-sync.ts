import { prisma } from './db'
import {
  getScriptProjects,
  fetchScriptContent,
  analyzeScript,
  extractBaseUrl,
  inferApiDescription
} from './script-sync'
import { getDriveClient } from './google-auth'
import type { ScriptProject, ScriptAnalysis } from '@/types'

export interface SyncResult {
  synced: number
  failed: number
  scripts: Array<{
    id: string
    name: string
    status: 'synced' | 'failed'
    error?: string
  }>
}

// Resolve file names from Drive API
async function resolveFileName(fileId: string): Promise<{ name: string; url: string } | null> {
  if (fileId === 'active') {
    return { name: 'Container Spreadsheet', url: '' }
  }

  try {
    const drive = getDriveClient()
    const response = await drive.files.get({
      fileId,
      fields: 'name, webViewLink'
    })

    return {
      name: response.data.name || 'Unknown',
      url: response.data.webViewLink || ''
    }
  } catch (error) {
    console.log(`  Could not resolve file name for ${fileId}`)
    return null
  }
}

// Sync all scripts to database
export async function syncToDatabase(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    scripts: []
  }

  console.log('Starting database sync... [v2-dedup-fix]')

  // 1. Discover all scripts
  const discoveredScripts = await getScriptProjects()
  console.log(`  Discovered ${discoveredScripts.length} scripts`)

  // 2. For each script, fetch content and analyze
  for (const scriptInfo of discoveredScripts) {
    try {
      console.log(`  Processing: ${scriptInfo.name}`)

      // Fetch actual code via Apps Script API
      const files = await fetchScriptContent(scriptInfo.id)

      if (files.length === 0) {
        console.log(`    Skipping: No files found`)
        continue
      }

      // Create project for analysis
      const parentName = (scriptInfo as { parentName?: string }).parentName
      const project: ScriptProject = {
        scriptId: scriptInfo.id,
        name: scriptInfo.name,
        parentId: scriptInfo.parentId || '',
        parentName: parentName || scriptInfo.name,
        files,
        lastSynced: new Date().toISOString()
      }

      // Analyze the code
      const analysis = analyzeScript(project)

      // Resolve file names for connected files
      const resolvedConnectedFiles = await Promise.all(
        analysis.connectedSpreadsheets.map(async (file) => {
          const resolved = await resolveFileName(file.fileId)
          return {
            ...file,
            fileName: resolved?.name || file.fileName,
            fileUrl: resolved?.url || file.fileUrl
          }
        })
      )

      // Calculate workflow steps as JSON string
      const workflowSteps = analysis.functionalSummary
        ? JSON.stringify(analysis.functionalSummary.workflowSteps)
        : null

      // Determine if this is a container-bound script
      const isContainerBound = scriptInfo.source === 'container-bound' && scriptInfo.parentId
      const parentFileType = isContainerBound ? 'spreadsheet' : 'standalone'

      // Normalize URL: remove trailing slashes, lowercase protocol/host
      const normalizeUrl = (url: string): string => {
        try {
          const parsed = new URL(url)
          // Normalize: lowercase protocol and host, remove trailing slash from path
          let path = parsed.pathname.replace(/\/+$/, '') || '/'
          return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}`
        } catch {
          return url.toLowerCase().replace(/\/+$/, '')
        }
      }
      
      // Deduplicate APIs by normalized (url, method) to avoid unique constraint violations
      const seenApis = new Map<string, typeof analysis.externalApis[0]>()
      for (const api of analysis.externalApis) {
        const normalizedUrl = normalizeUrl(api.url)
        const key = `${normalizedUrl}::${api.method.toUpperCase()}`
        if (!seenApis.has(key)) {
          seenApis.set(key, { ...api, url: normalizedUrl, method: api.method.toUpperCase() })
        }
      }
      const deduplicatedApis = Array.from(seenApis.values())
      
      // Double-check for duplicates before inserting (v2 - force rebuild)
      const finalKeys = new Set<string>()
      const finalApis = deduplicatedApis.filter(api => {
        const key = `${api.url}::${api.method}`
        if (finalKeys.has(key)) {
          console.log(`    [WARN] Duplicate API after dedup: ${key}`)
          return false
        }
        finalKeys.add(key)
        return true
      })
      
      if (finalApis.length !== deduplicatedApis.length) {
        console.log(`    [WARN] Removed ${deduplicatedApis.length - finalApis.length} duplicates for ${scriptInfo.name}`)
      }
      console.log(`    [DEBUG] Inserting ${finalApis.length} APIs for ${scriptInfo.name}`)

      // Delete existing APIs first to avoid unique constraint issues
      await prisma.externalApi.deleteMany({
        where: { scriptId: scriptInfo.id }
      })

      // Store in database with upsert
      await prisma.script.upsert({
        where: { id: scriptInfo.id },
        update: {
          name: scriptInfo.name,
          parentFileId: scriptInfo.parentId || null,
          parentFileName: parentName || null,
          parentFileType,
          lastSyncedAt: new Date(),
          lastAnalyzedAt: new Date(),
          functionalSummary: analysis.functionalSummary?.brief || analysis.summary,
          workflowSteps,
          complexity: analysis.complexity,
          linesOfCode: analysis.linesOfCode,
          // Update related data
          files: {
            deleteMany: {},
            create: files.map(f => ({
              name: f.name,
              type: f.type,
              content: f.source
            }))
          },
          apis: {
            create: finalApis.map(api => ({
              url: api.url,
              baseUrl: extractBaseUrl(api.url),
              method: api.method,
              description: api.description,
              usageCount: api.count,
              codeLocation: api.codeLocation
            }))
          },
          triggers: {
            deleteMany: {},
            create: analysis.triggers.map(trigger => ({
              type: trigger.type,
              functionName: trigger.function,
              schedule: trigger.schedule,
              scheduleDescription: trigger.scheduleDescription,
              sourceEvent: trigger.sourceEvent,
              isProgrammatic: trigger.isProgrammatic || false,
              status: 'enabled'
            }))
          },
          connectedFiles: {
            deleteMany: {},
            create: resolvedConnectedFiles.map(file => ({
              fileId: file.fileId,
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              accessType: file.accessType,
              extractedFrom: file.extractedFrom,
              codeLocation: file.codeLocation
            }))
          },
          functions: {
            deleteMany: {},
            create: analysis.functions.map(func => ({
              name: func.name,
              description: func.description,
              parameters: JSON.stringify(func.parameters),
              isPublic: func.isPublic,
              lineCount: func.lineCount,
              fileName: func.fileName
            }))
          },
          googleServices: {
            deleteMany: {},
            create: analysis.googleServices.map(service => ({
              serviceName: service
            }))
          }
        },
        create: {
          id: scriptInfo.id,
          name: scriptInfo.name,
          parentFileId: scriptInfo.parentId || null,
          parentFileName: parentName || null,
          parentFileType,
          lastSyncedAt: new Date(),
          lastAnalyzedAt: new Date(),
          functionalSummary: analysis.functionalSummary?.brief || analysis.summary,
          workflowSteps,
          complexity: analysis.complexity,
          linesOfCode: analysis.linesOfCode,
          files: {
            create: files.map(f => ({
              name: f.name,
              type: f.type,
              content: f.source
            }))
          },
          apis: {
            create: finalApis.map(api => ({
              url: api.url,
              baseUrl: extractBaseUrl(api.url),
              method: api.method,
              description: api.description,
              usageCount: api.count,
              codeLocation: api.codeLocation
            }))
          },
          triggers: {
            create: analysis.triggers.map(trigger => ({
              type: trigger.type,
              functionName: trigger.function,
              schedule: trigger.schedule,
              scheduleDescription: trigger.scheduleDescription,
              sourceEvent: trigger.sourceEvent,
              isProgrammatic: trigger.isProgrammatic || false,
              status: 'enabled'
            }))
          },
          connectedFiles: {
            create: resolvedConnectedFiles.map(file => ({
              fileId: file.fileId,
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              accessType: file.accessType,
              extractedFrom: file.extractedFrom,
              codeLocation: file.codeLocation
            }))
          },
          functions: {
            create: analysis.functions.map(func => ({
              name: func.name,
              description: func.description,
              parameters: JSON.stringify(func.parameters),
              isPublic: func.isPublic,
              lineCount: func.lineCount,
              fileName: func.fileName
            }))
          },
          googleServices: {
            create: analysis.googleServices.map(service => ({
              serviceName: service
            }))
          }
        }
      })

      result.synced++
      result.scripts.push({
        id: scriptInfo.id,
        name: scriptInfo.name,
        status: 'synced'
      })
      console.log(`    Synced: ${scriptInfo.name} (${files.length} files, ${analysis.functions.length} functions)`)
    } catch (error) {
      console.error(`    Failed: ${scriptInfo.name}`, error)
      result.failed++
      result.scripts.push({
        id: scriptInfo.id,
        name: scriptInfo.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`)
  return result
}

// Get all scripts from database with full details
export async function getScriptsFromDb() {
  return prisma.script.findMany({
    include: {
      apis: true,
      triggers: true,
      connectedFiles: true,
      googleServices: true,
      _count: {
        select: {
          executions: true,
          functions: true,
          files: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })
}

// Get a single script with all details
export async function getScriptFromDb(id: string) {
  return prisma.script.findUnique({
    where: { id },
    include: {
      files: true,
      apis: true,
      triggers: true,
      connectedFiles: true,
      executions: {
        take: 50,
        orderBy: { startedAt: 'desc' }
      },
      functions: true,
      googleServices: true
    }
  })
}

// Store execution record
export async function recordExecution(
  scriptId: string,
  functionName: string,
  status: string,
  duration?: number,
  errorMessage?: string
) {
  return prisma.execution.create({
    data: {
      scriptId,
      functionName,
      startedAt: new Date(Date.now() - (duration || 0) * 1000),
      endedAt: new Date(),
      duration,
      status,
      errorMessage
    }
  })
}

// Get script count and stats from database
export async function getDbStats() {
  const [
    totalScripts,
    totalExecutions,
    recentExecutions,
    successfulExecutions
  ] = await Promise.all([
    prisma.script.count(),
    prisma.execution.count(),
    prisma.execution.count({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    }),
    prisma.execution.count({
      where: {
        status: 'success',
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
  ])

  const successRate = recentExecutions > 0
    ? Math.round((successfulExecutions / recentExecutions) * 100)
    : 100

  // Get complexity distribution
  const complexityGroups = await prisma.script.groupBy({
    by: ['complexity'],
    _count: true
  })

  const complexityDistribution = {
    low: 0,
    medium: 0,
    high: 0
  }

  for (const group of complexityGroups) {
    if (group.complexity === 'low') complexityDistribution.low = group._count
    if (group.complexity === 'medium') complexityDistribution.medium = group._count
    if (group.complexity === 'high') complexityDistribution.high = group._count
  }

  return {
    totalScripts,
    totalExecutions,
    executionsToday: recentExecutions,
    successRate,
    complexityDistribution
  }
}

// Search scripts by name or content
export async function searchScripts(query: string) {
  return prisma.script.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { functionalSummary: { contains: query } },
        {
          files: {
            some: {
              content: { contains: query }
            }
          }
        }
      ]
    },
    include: {
      apis: true,
      triggers: true,
      googleServices: true,
      _count: {
        select: { functions: true, files: true }
      }
    }
  })
}
