import { NextResponse } from 'next/server'
import { syncAllExecutions, getExecutionStats } from '@/lib/execution-sync'

export const dynamic = 'force-dynamic'

// POST: Sync execution history from Apps Script API
export async function POST() {
  try {
    console.log('Starting execution sync...')

    const result = await syncAllExecutions()

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} scripts, ${result.failed} failed`,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Execution sync error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to sync executions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET: Get execution stats
export async function GET() {
  try {
    const stats = await getExecutionStats()

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching execution stats:', error)

    return NextResponse.json({
      error: 'Failed to fetch execution stats',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
