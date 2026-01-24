import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDriveClient } from '@/lib/google-auth'
import { Script, FileType } from '@/types'

export const dynamic = 'force-dynamic'

// Map of known script types based on sheet names (fallback for scripts not in DB)
const SCRIPT_TYPE_MAP: Record<string, { type: Script['type'], description: string }> = {
  'attendance': { type: 'time-driven', description: 'Manages attendance tracking and reminders' },
  'reminder': { type: 'time-driven', description: 'Sends automated reminders' },
  'validation': { type: 'time-driven', description: 'Validates requests against policies' },
  'integration': { type: 'time-driven', description: 'Integrates with external systems' },
  'sync': { type: 'time-driven', description: 'Synchronizes data between systems' },
  'generator': { type: 'on-edit', description: 'Generates documents on demand' },
  'tracker': { type: 'on-edit', description: 'Tracks and monitors activities' },
  'report': { type: 'time-driven', description: 'Generates reports and statistics' },
  'request': { type: 'on-edit', description: 'Processes requests' },
  'performance': { type: 'time-driven', description: 'Monitors performance metrics' },
}

function inferScriptDetails(name: string): { type: Script['type'], description: string, apis: string[] } {
  const nameLower = name.toLowerCase()
  const apis: string[] = []

  for (const [pattern, details] of Object.entries(SCRIPT_TYPE_MAP)) {
    if (nameLower.includes(pattern)) {
      if (nameLower.includes('slack')) apis.push('Slack API')
      if (nameLower.includes('workable')) apis.push('Workable API')
      if (nameLower.includes('jisr')) apis.push('Jisr API')
      if (nameLower.includes('letter') || nameLower.includes('document')) apis.push('Google Drive API')
      return { ...details, apis }
    }
  }

  return { type: 'time-driven', description: `Automation script for ${name}`, apis }
}

export async function GET() {
  try {
    // First, try to get scripts from database
    const dbScripts = await prisma.script.findMany({
      include: {
        apis: true,
        triggers: true,
        connectedFiles: true,
        googleServices: true,
        executions: {
          take: 1,
          orderBy: { startedAt: 'desc' }
        },
        _count: {
          select: { functions: true, files: true, executions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // If we have scripts in database, return them
    if (dbScripts.length > 0) {
      const scripts: Script[] = dbScripts.map((dbScript) => {
        // Parse workflow steps if available
        let workflowSteps: string[] = []
        if (dbScript.workflowSteps) {
          try {
            workflowSteps = JSON.parse(dbScript.workflowSteps)
          } catch {
            workflowSteps = []
          }
        }

        // Get the main trigger type
        const mainTrigger = dbScript.triggers[0]
        const triggerType = mainTrigger?.type || 'time-driven'

        // Calculate status based on executions
        let status: Script['status'] = 'healthy'
        const lastExecution = dbScript.executions[0]
        if (lastExecution?.status === 'error') {
          status = 'error'
        } else if (!lastExecution && dbScript._count.executions === 0) {
          // Never run
          const hoursSinceSync = dbScript.lastSyncedAt
            ? (Date.now() - new Date(dbScript.lastSyncedAt).getTime()) / (1000 * 60 * 60)
            : 999
          if (hoursSinceSync > 168) status = 'inactive'
        }

        // Determine file type
        let fileType: FileType = 'standalone'
        if (dbScript.parentFileType === 'spreadsheet') fileType = 'spreadsheet'
        else if (dbScript.parentFileType === 'document') fileType = 'document'

        return {
          id: dbScript.id,
          name: dbScript.name,
          description: dbScript.functionalSummary || dbScript.description || '',
          parentFile: {
            id: dbScript.parentFileId || dbScript.id,
            name: dbScript.parentFileName || dbScript.name,
            type: fileType,
            url: fileType === 'spreadsheet'
              ? `https://docs.google.com/spreadsheets/d/${dbScript.parentFileId || dbScript.id}`
              : `https://script.google.com/d/${dbScript.id}/edit`
          },
          status,
          type: triggerType as Script['type'],
          triggers: dbScript.triggers.map(t => ({
            id: t.id,
            type: t.type as Script['type'],
            function: t.functionName,
            schedule: t.schedule || undefined,
            scheduleDescription: t.scheduleDescription || undefined,
            lastFire: t.lastFiredAt,
            nextFire: t.nextFireAt,
            status: t.status as 'enabled' | 'disabled'
          })),
          externalAPIs: dbScript.apis.map(a => a.description),
          sharedLibraries: [],
          connectedFiles: dbScript.connectedFiles.map(f => ({
            id: f.id,
            name: f.fileName || f.fileId,
            type: f.fileType as FileType,
            url: f.fileUrl || '',
            accessType: f.accessType as 'read' | 'write' | 'read-write',
            fileId: f.fileId,
            extractedFrom: f.extractedFrom,
            codeLocation: f.codeLocation || undefined
          })),
          lastRun: lastExecution?.startedAt || null,
          nextRun: mainTrigger?.nextFireAt || null,
          avgExecutionTime: lastExecution?.duration || 0,
          owner: dbScript.owner || 'unknown',
          createdAt: dbScript.createdAt,
          updatedAt: dbScript.updatedAt,
          // Enhanced fields
          functionalSummary: dbScript.functionalSummary || undefined,
          workflowSteps,
          complexity: dbScript.complexity as 'low' | 'medium' | 'high' | undefined,
          linesOfCode: dbScript.linesOfCode || undefined,
          googleServices: dbScript.googleServices.map(s => s.serviceName),
          apis: dbScript.apis.map(a => ({
            id: a.id,
            url: a.url,
            baseUrl: a.baseUrl,
            method: a.method,
            description: a.description,
            usageCount: a.usageCount,
            codeLocation: a.codeLocation || undefined
          }))
        }
      })

      return NextResponse.json({ scripts, count: scripts.length, source: 'database' })
    }

    // Fallback: Fetch from Google Drive if no database records
    const drive = getDriveClient()

    const standaloneResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.script'",
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc'
    })

    const standaloneScripts = standaloneResponse.data.files || []

    const sheetsResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and 'me' in owners",
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc'
    })

    const sheets = sheetsResponse.data.files || []

    // Deduplicate sheets by name
    const sheetsByName = new Map<string, typeof sheets[0]>()
    for (const sheet of sheets) {
      const name = sheet.name || 'Unknown'
      const existing = sheetsByName.get(name)
      if (!existing || (sheet.modifiedTime && existing.modifiedTime && sheet.modifiedTime > existing.modifiedTime)) {
        sheetsByName.set(name, sheet)
      }
    }
    const uniqueSheets = Array.from(sheetsByName.values())

    const allFiles = [
      ...standaloneScripts.map(f => ({ ...f, fileType: 'standalone' as const })),
      ...uniqueSheets.map(f => ({ ...f, fileType: 'spreadsheet' as const }))
    ]

    const uniqueFiles = allFiles.filter((file, index, self) =>
      index === self.findIndex((f) => f.id === file.id)
    )

    const scripts: Script[] = uniqueFiles.map((file, index) => {
      const details = inferScriptDetails(file.name || 'Unknown')
      const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date()
      const createdTime = file.createdTime ? new Date(file.createdTime) : new Date()

      const hoursSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60)
      let status: Script['status'] = 'healthy'
      if (hoursSinceModified > 168) status = 'inactive'
      else if (hoursSinceModified > 48) status = 'warning'

      const isStandalone = file.fileType === 'standalone'
      const fileType: FileType = isStandalone ? 'standalone' : 'spreadsheet'
      const fileUrl = isStandalone
        ? `https://script.google.com/d/${file.id}/edit`
        : `https://docs.google.com/spreadsheets/d/${file.id}`

      return {
        id: file.id || `script-${index}`,
        name: file.name || 'Unknown Script',
        description: details.description,
        parentFile: {
          id: file.id || '',
          name: file.name || '',
          type: fileType,
          url: fileUrl
        },
        status,
        type: details.type,
        triggers: [{
          id: `trigger-${file.id}`,
          type: details.type === 'on-edit' ? 'on-edit' : 'time-driven',
          function: 'main',
          schedule: details.type === 'time-driven' ? '0 * * * *' : undefined,
          lastFire: null,
          nextFire: null,
          status: 'enabled' as const
        }],
        externalAPIs: details.apis,
        sharedLibraries: [],
        connectedFiles: [],
        lastRun: null,
        nextRun: null,
        avgExecutionTime: 0,
        owner: file.owners?.[0]?.emailAddress || 'unknown',
        createdAt: createdTime,
        updatedAt: modifiedTime
      }
    })

    return NextResponse.json({
      scripts,
      count: scripts.length,
      source: 'drive',
      message: 'Run POST /api/sync to populate database with analyzed scripts'
    })
  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scripts', details: String(error) },
      { status: 500 }
    )
  }
}
