import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDriveClient } from '@/lib/google-auth'
import { Script, FileType } from '@/types'

export const dynamic = 'force-dynamic'

// Map of known script types based on sheet names (fallback)
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // First, try to get from database with full details
    const dbScript = await prisma.script.findUnique({
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

    if (dbScript) {
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
      }

      // Determine file type
      let fileType: FileType = 'standalone'
      if (dbScript.parentFileType === 'spreadsheet') fileType = 'spreadsheet'
      else if (dbScript.parentFileType === 'document') fileType = 'document'

      const script: Script & {
        files?: Array<{ id: string; name: string; type: string; content: string }>
      } = {
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
          sourceEvent: t.sourceEvent || undefined,
          isProgrammatic: t.isProgrammatic,
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
        })),
        executions: dbScript.executions.map(e => ({
          id: e.id,
          functionName: e.functionName,
          startedAt: e.startedAt,
          endedAt: e.endedAt || undefined,
          duration: e.duration || undefined,
          status: e.status,
          errorMessage: e.errorMessage || undefined
        })),
        // Include source code files
        files: dbScript.files.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          content: f.content
        })),
        // Include functions
        functions: dbScript.functions.map(f => {
          let params: string[] = []
          if (f.parameters) {
            try {
              params = JSON.parse(f.parameters)
            } catch {
              params = []
            }
          }
          return {
            name: f.name,
            description: f.description || '',
            parameters: params,
            isPublic: f.isPublic,
            lineCount: f.lineCount || 0,
            fileName: f.fileName || undefined
          }
        })
      }

      return NextResponse.json({ script, source: 'database' })
    }

    // Fallback: Fetch from Google Drive
    const drive = getDriveClient()

    const response = await drive.files.get({
      fileId: id,
      fields: 'id, name, createdTime, modifiedTime, owners, mimeType'
    })

    const file = response.data

    if (!file || !file.id) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const details = inferScriptDetails(file.name || 'Unknown')
    const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date()
    const createdTime = file.createdTime ? new Date(file.createdTime) : new Date()

    const hoursSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60)
    let status: Script['status'] = 'healthy'
    if (hoursSinceModified > 168) status = 'inactive'
    else if (hoursSinceModified > 48) status = 'warning'

    let fileType: FileType = 'spreadsheet'
    if (file.mimeType?.includes('document')) fileType = 'document'
    else if (file.mimeType?.includes('script')) fileType = 'standalone'

    const script: Script = {
      id: file.id,
      name: file.name || 'Unknown Script',
      description: details.description,
      parentFile: {
        id: file.id,
        name: file.name || '',
        type: fileType,
        url: fileType === 'spreadsheet'
          ? `https://docs.google.com/spreadsheets/d/${file.id}`
          : fileType === 'document'
          ? `https://docs.google.com/document/d/${file.id}`
          : `https://script.google.com/d/${file.id}/edit`
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
        status: 'enabled'
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

    return NextResponse.json({
      script,
      source: 'drive',
      message: 'Run POST /api/sync to populate database with analyzed script details'
    })
  } catch (error: unknown) {
    console.error('Error fetching script:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch script', details: String(error) },
      { status: 500 }
    )
  }
}
