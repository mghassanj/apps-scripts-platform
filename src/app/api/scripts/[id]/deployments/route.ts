import { NextRequest, NextResponse } from 'next/server'
import { getScriptClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

// Deployment type based on entry points
type DeploymentType = 'web-app' | 'api-executable' | 'add-on' | 'library' | 'unknown'

interface DeploymentInfo {
  deploymentId: string
  versionNumber: number | null
  webAppUrl: string | null
  updateTime: string | null
  deploymentType: DeploymentType
  entryPoints: Array<{
    type: string
    url?: string
    addOnType?: string
  }>
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: scriptId } = await context.params

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      )
    }

    const script = getScriptClient()

    // Fetch deployments from Google Apps Script API
    const response = await script.projects.deployments.list({
      scriptId: scriptId,
    })

    const deployments = response.data.deployments || []

    // Transform deployments into a consistent format
    const formattedDeployments: DeploymentInfo[] = deployments.map((deployment) => {
      const entryPoints = deployment.entryPoints || []

      // Determine deployment type from entry points
      let deploymentType: DeploymentType = 'unknown'
      let webAppUrl: string | null = null

      for (const entryPoint of entryPoints) {
        if (entryPoint.entryPointType === 'WEB_APP') {
          deploymentType = 'web-app'
          webAppUrl = entryPoint.webApp?.url || null
          break
        } else if (entryPoint.entryPointType === 'EXECUTION_API') {
          deploymentType = 'api-executable'
        } else if (entryPoint.entryPointType === 'ADD_ON') {
          deploymentType = 'add-on'
        }
      }

      // If no entry points but deployment exists, might be a library
      if (deploymentType === 'unknown' && deployment.deploymentId) {
        deploymentType = 'library'
      }

      return {
        deploymentId: deployment.deploymentId || '',
        versionNumber: deployment.deploymentConfig?.versionNumber || null,
        webAppUrl,
        updateTime: deployment.updateTime || null,
        deploymentType,
        entryPoints: entryPoints.map((ep) => ({
          type: ep.entryPointType || 'unknown',
          url: ep.webApp?.url || undefined,
          addOnType: ep.addOn?.addOnType || undefined,
        })),
      }
    })

    // Sort by update time (most recent first)
    formattedDeployments.sort((a, b) => {
      if (!a.updateTime) return 1
      if (!b.updateTime) return -1
      return new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
    })

    return NextResponse.json({
      scriptId,
      deployments: formattedDeployments,
      count: formattedDeployments.length,
    })
  } catch (error: unknown) {
    console.error('Error fetching deployments:', error)

    // Handle specific Google API errors
    if (error && typeof error === 'object') {
      const googleError = error as { code?: number; message?: string; errors?: Array<{ reason?: string }> }

      if (googleError.code === 404) {
        return NextResponse.json(
          { error: 'Script not found', scriptId: 'unknown' },
          { status: 404 }
        )
      }

      if (googleError.code === 403) {
        const reason = googleError.errors?.[0]?.reason
        if (reason === 'forbidden') {
          return NextResponse.json(
            {
              error: 'Access denied. You may not have permission to view this script\'s deployments.',
              details: googleError.message
            },
            { status: 403 }
          )
        }
        // Apps Script API might not be enabled
        return NextResponse.json(
          {
            error: 'Access forbidden. The Apps Script API may not be enabled for this project.',
            details: googleError.message
          },
          { status: 403 }
        )
      }

      if (googleError.code === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your credentials.' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch deployments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
