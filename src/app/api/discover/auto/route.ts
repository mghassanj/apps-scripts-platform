import { NextRequest, NextResponse } from 'next/server'
import { discoverScripts, verifyScriptId, addScriptToConfig } from '@/lib/script-discovery'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for discovery

/**
 * GET /api/discover/auto
 *
 * Automatically discovers scripts by analyzing execution history.
 * Returns a list of discovered scripts categorized as:
 * - known: Already in our scripts-to-sync.json
 * - new: New custom scripts that should be added
 * - addon: Third-party add-ons (filtered out)
 */
export async function GET() {
  try {
    console.log('Starting automatic script discovery...')

    const result = await discoverScripts()

    return NextResponse.json({
      success: true,
      discovery: result,
      summary: {
        message: `Found ${result.total} scripts: ${result.known} known, ${result.new} new, ${result.addons} add-ons`,
        actionRequired: result.new > 0,
        newScripts: result.scripts.filter(s => s.status === 'new')
      }
    })
  } catch (error) {
    console.error('Discovery error:', error)
    return NextResponse.json(
      {
        error: 'Discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/discover/auto
 *
 * Add a newly discovered script by providing its script ID.
 * The script ID can be found in the Apps Script editor URL.
 *
 * Body: { scriptId: string, name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scriptId, name } = body as { scriptId: string; name?: string }

    if (!scriptId) {
      return NextResponse.json(
        { error: 'scriptId is required' },
        { status: 400 }
      )
    }

    // Verify the script ID is valid
    console.log(`Verifying script ID: ${scriptId}`)
    const verification = await verifyScriptId(scriptId)

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: 'Invalid script ID',
          details: verification.error
        },
        { status: 400 }
      )
    }

    // Use the verified name or the provided name
    const scriptName = name || verification.name || 'Unknown Script'

    // Add to config
    const added = await addScriptToConfig(scriptId, scriptName)

    if (!added) {
      return NextResponse.json({
        success: false,
        message: 'Script already exists in configuration',
        script: {
          id: scriptId,
          name: scriptName,
          parentId: verification.parentId
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Script added to configuration',
      script: {
        id: scriptId,
        name: scriptName,
        parentId: verification.parentId
      },
      nextStep: 'Call POST /api/discover with this script to sync it to the database'
    })
  } catch (error) {
    console.error('Add script error:', error)
    return NextResponse.json(
      {
        error: 'Failed to add script',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
