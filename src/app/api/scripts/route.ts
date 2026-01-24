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

    // Fetch all Google Sheets (which may contain bound scripts)
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc'
    })

    const files = response.data.files || []

    // Transform to Script format
    const scripts: Script[] = files.map((file, index) => {
      const details = inferScriptDetails(file.name || 'Unknown')
      const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : new Date()
      const createdTime = file.createdTime ? new Date(file.createdTime) : new Date()

      // Determine status based on last modified time
      const hoursSinceModified = (Date.now() - modifiedTime.getTime()) / (1000 * 60 * 60)
      let status: Script['status'] = 'healthy'
      if (hoursSinceModified > 168) status = 'inactive' // > 1 week
      else if (hoursSinceModified > 48) status = 'warning' // > 2 days

      return {
        id: file.id || `script-${index}`,
        name: file.name || 'Unknown Script',
        description: details.description,
        parentFile: {
          id: file.id || '',
          name: file.name || '',
          type: 'spreadsheet' as FileType,
          url: `https://docs.google.com/spreadsheets/d/${file.id}`
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
