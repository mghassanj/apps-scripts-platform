import { NextResponse } from 'next/server'
import { syncAllExecutions, getExecutionStats } from '@/lib/execution-sync'

// POST: Sync execution history for all scripts
export async function POST() {
  try {
    console.log('Starting execution history sync...')

    const result = await syncAllExecutions()

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Execution sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync executions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: Get execution statistics
export async function GET() {
  try {
    const stats = await getExecutionStats()

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting execution stats:', error)
    return NextResponse.json(
      { error: 'Failed to get execution stats' },
      { status: 500 }
    )
  }
}
