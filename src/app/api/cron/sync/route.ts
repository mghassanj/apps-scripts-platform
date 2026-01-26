import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for sync

/**
 * Cron endpoint for automatic script syncing
 *
 * Security: Requires CRON_SECRET header to match environment variable
 * This prevents unauthorized triggering of the sync
 *
 * This endpoint syncs both:
 * 1. Script content (code, functions, APIs, etc.)
 * 2. Execution logs from Google Apps Script
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Get the base URL for internal API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` :
                    'http://localhost:3000'

    // 1. Sync script content
    console.log('Cron: Starting script content sync...')
    const syncResponse = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const syncResult = await syncResponse.json()

    if (!syncResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Script sync failed',
          details: syncResult,
          timestamp: new Date().toISOString()
        },
        { status: syncResponse.status }
      )
    }

    // 2. Sync execution logs
    console.log('Cron: Starting execution logs sync...')
    let executionResult = null
    try {
      const execResponse = await fetch(`${baseUrl}/api/sync/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      executionResult = await execResponse.json()

      if (!execResponse.ok) {
        console.error('Execution sync failed:', executionResult)
      }
    } catch (execError) {
      console.error('Execution sync error:', execError)
      executionResult = { error: execError instanceof Error ? execError.message : 'Unknown error' }
    }

    return NextResponse.json({
      success: true,
      message: 'Cron sync completed',
      scriptSync: syncResult,
      executionSync: executionResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron sync failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
