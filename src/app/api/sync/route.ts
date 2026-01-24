import { NextResponse } from 'next/server'
import {
  syncAllScripts,
  analyzeScript,
  getSyncStatus,
  getAllAnalyses
} from '@/lib/script-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full sync

// GET - Get sync status and analyses
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  try {
    if (action === 'status') {
      const status = getSyncStatus()
      return NextResponse.json({
        status: status ? 'synced' : 'never',
        ...status
      })
    }

    if (action === 'analyses') {
      const analyses = getAllAnalyses()
      return NextResponse.json({ analyses })
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
    const { analyzeAfterSync = true } = body

    // Sync all scripts from Google
    console.log('Starting script sync...')
    const syncResult = await syncAllScripts()
    console.log(`Synced ${syncResult.synced} scripts, ${syncResult.failed} failed`)

    // Analyze each synced script
    const analyses = []
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

    return NextResponse.json({
      success: true,
      synced: syncResult.synced,
      failed: syncResult.failed,
      analyzed: analyses.length,
      analyses: analyses.map(a => ({
        name: a.name,
        summary: a.summary,
        complexity: a.complexity,
        linesOfCode: a.linesOfCode,
        functionCount: a.functions.length,
        apiCount: a.externalApis.length,
        suggestions: a.suggestions.length
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
