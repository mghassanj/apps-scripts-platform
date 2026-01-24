import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for sync

/**
 * Cron endpoint for automatic script syncing
 *
 * Security: Requires CRON_SECRET header to match environment variable
 * This prevents unauthorized triggering of the sync
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

    // Call the sync endpoint internally
    const syncResponse = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = await syncResponse.json()

    if (!syncResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync failed',
          details: result,
          timestamp: new Date().toISOString()
        },
        { status: syncResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cron sync completed',
      result,
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
