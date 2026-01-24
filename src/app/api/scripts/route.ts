import { NextResponse } from 'next/server'
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

  // Check for known patterns
  for (const [pattern, details] of Object.entries(SCRIPT_TYPE_MAP)) {
    if (nameLower.includes(pattern)) {
      if (nameLower.includes('slack')) apis.push('Slack API')
      if (nameLower.includes('workable')) apis.push('Workable API')
      if (nameLower.includes('letter') || nameLower.includes('document')) apis.push('Google Drive API')
      return { ...details, apis }
    }
  }

  // Default
  return { type: 'time-driven', description: `Automation script for ${name}`, apis }
}

export async function GET() {
  try {
    const drive = getDriveClient()

    // Fetch actual Google Apps Script projects (standalone scripts)
    const standaloneResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.script'",
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc'
    })

    const standaloneScripts = standaloneResponse.data.files || []

    // Also get container-bound scripts by looking for spreadsheets that the user owns
    // and filtering to only show unique names (the main template, not copies)
    const sheetsResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and 'me' in owners",
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc'
    })

    const sheets = sheetsResponse.data.files || []

    // Deduplicate sheets by name - keep only the most recently modified one per name
    const sheetsByName = new Map<string, typeof sheets[0]>()
    for (const sheet of sheets) {
      const name = sheet.name || 'Unknown'
      const existing = sheetsByName.get(name)
      if (!existing || (sheet.modifiedTime && existing.modifiedTime && sheet.modifiedTime > existing.modifiedTime)) {
        sheetsByName.set(name, sheet)
      }
    }
    const uniqueSheets = Array.from(sheetsByName.values())

    // Combine standalone scripts and unique sheets
    const allFiles = [
      ...standaloneScripts.map(f => ({ ...f, fileType: 'standalone' as const })),
      ...uniqueSheets.map(f => ({ ...f, fileType: 'spreadsheet' as const }))
    ]

    // Deduplicate by file ID
    const uniqueFiles = allFiles.filter((file, index, self) =>
      index === self.findIndex((f) => f.id === file.id)
    )

    // Transform to Script format
    const scripts: Script[] = uniqueFiles.map((file, index) => {
      const details = inferScriptDetails(file.name || 'Unknown')
      const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date()
      const createdTime = file.createdTime ? new Date(file.createdTime) : new Date()

      // Determine status based on last modified time
      const hoursSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60)
      let status: Script['status'] = 'healthy'
      if (hoursSinceModified > 168) status = 'inactive' // > 1 week
      else if (hoursSinceModified > 48) status = 'warning' // > 2 days

      // Determine file type and URL based on source
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
    })

    return NextResponse.json({ scripts, count: scripts.length })
  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scripts', details: String(error) },
      { status: 500 }
    )
  }
}
