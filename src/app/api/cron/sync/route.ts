import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for automatic script syncing (ASYNC)
 *
 * Security: Requires CRON_SECRET header to match environment variable
 * This prevents unauthorized triggering of the sync
 *
 * This endpoint triggers sync in the background and returns immediately.
 * Sync runs async - cron doesn't wait for completion.
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

  // Get the base URL for internal API call
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` :
                  'http://localhost:3000'

  // Fire and forget - trigger sync without waiting
  console.log('Cron: Triggering async script sync...')
  
  // Trigger script sync (don't await)
  fetch(`${baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).then(res => {
    console.log(`Cron: Script sync completed with status ${res.status}`)
  }).catch(err => {
    console.error('Cron: Script sync error:', err.message)
  })

  // Trigger execution logs sync (don't await)
  fetch(`${baseUrl}/api/sync/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).then(res => {
    console.log(`Cron: Execution sync completed with status ${res.status}`)
  }).catch(err => {
    console.error('Cron: Execution sync error:', err.message)
  })

  // Return immediately
  return NextResponse.json({
    success: true,
    message: 'Sync triggered (running async)',
    timestamp: new Date().toISOString()
  })
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
