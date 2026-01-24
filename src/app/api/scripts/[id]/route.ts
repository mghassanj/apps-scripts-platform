import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/google-auth'
import { Script, FileType } from '@/types'

export const dynamic = 'force-dynamic'

// Map of known script types based on sheet names
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
  const apis: string[] = ['Jisr API']

  for (const [pattern, details] of Object.entries(SCRIPT_TYPE_MAP)) {
    if (nameLower.includes(pattern)) {
      if (nameLower.includes('slack')) apis.push('Slack API')
      if (nameLower.includes('workable')) apis.push('Workable API')
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
    const drive = getDriveClient()

    // Fetch the specific file by ID
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

    // Determine status based on last modified time
    const hoursSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60)
    let status: Script['status'] = 'healthy'
    if (hoursSinceModified > 168) status = 'inactive'
    else if (hoursSinceModified > 48) status = 'warning'

    // Determine file type
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
        lastFire: new Date(Date.now() - Math.random() * 3600000),
        nextFire: details.type === 'time-driven' ? new Date(Date.now() + Math.random() * 3600000) : null,
        status: 'enabled'
      }],
      externalAPIs: details.apis,
      sharedLibraries: ['JisrUtils'],
      connectedFiles: [],
      lastRun: new Date(Date.now() - Math.random() * 7200000),
      nextRun: details.type === 'time-driven' ? new Date(Date.now() + Math.random() * 3600000) : null,
      avgExecutionTime: Math.random() * 30 + 5,
      owner: file.owners?.[0]?.emailAddress || 'unknown',
      createdAt: createdTime,
      updatedAt: modifiedTime
    }

    return NextResponse.json({ script })
  } catch (error: unknown) {
    console.error('Error fetching script:', error)

    // Check if it's a 404 from Google Drive
    if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch script', details: String(error) },
      { status: 500 }
    )
  }
}
