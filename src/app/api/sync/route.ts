import { NextResponse } from 'next/server'
import {
  syncAllScripts,
  analyzeScript,
  getSyncStatus,
  getAllAnalyses
} from '@/lib/script-sync'
import { syncToDatabase, getDbStats } from '@/lib/db-sync'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full sync

// GET - Get sync status and analyses
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  try {
    if (action === 'status') {
      // Get both file-based and database status
      const fileStatus = getSyncStatus()
      const dbStats = await getDbStats()

      // Get last sync from database
      const lastSyncedScript = await prisma.script.findFirst({
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true }
      })

      return NextResponse.json({
        status: dbStats.totalScripts > 0 ? 'synced' : fileStatus ? 'file-only' : 'never',
        database: {
          totalScripts: dbStats.totalScripts,
          totalExecutions: dbStats.totalExecutions,
          executionsToday: dbStats.executionsToday,
          successRate: dbStats.successRate,
          lastSync: lastSyncedScript?.lastSyncedAt || null,
          complexityDistribution: dbStats.complexityDistribution
        },
        files: fileStatus
      })
    }

    if (action === 'analyses') {
      const analyses = getAllAnalyses()
      return NextResponse.json({ analyses })
    }

    if (action === 'dbstats') {
      const stats = await getDbStats()
      return NextResponse.json({ stats })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Sync GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Trigger sync and analysis
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      analyzeAfterSync = true,
      useDatabase = true,  // New option to sync to database
      fileSync = true      // Also sync to files
    } = body

    let fileSyncResult = null
    let dbSyncResult = null
    const analyses = []

    // File-based sync (existing behavior)
    if (fileSync) {
      console.log('Starting file-based script sync...')
      const syncResult = await syncAllScripts()
      console.log(`File sync: ${syncResult.synced} synced, ${syncResult.failed} failed`)

      fileSyncResult = {
        synced: syncResult.synced,
        failed: syncResult.failed
      }

      // Analyze each synced script
      if (analyzeAfterSync) {
        console.log('Analyzing scripts...')
        for (const project of syncResult.projects) {
          try {
            const analysis = analyzeScript(project)
            analyses.push(analysis)
          } catch (err) {
            console.error(`Failed to analyze ${project.name}:`, err)
          }
        }
      }
    }

    // Database sync (new behavior)
    if (useDatabase) {
      console.log('Starting database sync...')
      dbSyncResult = await syncToDatabase()
      console.log(`Database sync: ${dbSyncResult.synced} synced, ${dbSyncResult.failed} failed`)
    }

    return NextResponse.json({
      success: true,
      fileSync: fileSyncResult,
      databaseSync: dbSyncResult ? {
        synced: dbSyncResult.synced,
        failed: dbSyncResult.failed,
        scripts: dbSyncResult.scripts.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status
        }))
      } : null,
      analyzed: analyses.length,
      analyses: analyses.map(a => ({
        name: a.name,
        summary: a.functionalSummary?.brief || a.summary,
        complexity: a.complexity,
        linesOfCode: a.linesOfCode,
        functionCount: a.functions.length,
        apiCount: a.externalApis.length,
        connectedFiles: a.connectedSpreadsheets?.length || 0,
        triggerCount: a.triggers.length,
        suggestions: a.suggestions.length,
        workflowSteps: a.functionalSummary?.workflowSteps || []
      }))
    })
  } catch (error) {
    console.error('Sync POST error:', error)
    return NextResponse.json(
      { error: 'Failed to sync scripts', details: String(error) },
      { status: 500 }
    )
  }
}
