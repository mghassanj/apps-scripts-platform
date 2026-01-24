import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

interface MetricValue {
  value: string
  startTime: string
  endTime: string
}

interface MetricsResponse {
  activeUsers?: MetricValue[]
  totalExecutions?: MetricValue[]
  failedExecutions?: MetricValue[]
}

interface GoogleMetricsResponse {
  metrics?: Array<{
    activeUsers?: Array<{
      values?: MetricValue[]
    }>
    totalExecutions?: Array<{
      values?: MetricValue[]
    }>
    failedExecutions?: Array<{
      values?: MetricValue[]
    }>
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      )
    }

    const auth = getOAuth2Client()

    // Ensure we have a fresh access token
    const { token } = await auth.getAccessToken()

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 401 }
      )
    }

    // Fetch metrics from Google Apps Script API
    const metricsUrl = `https://script.googleapis.com/v1/projects/${scriptId}/metrics?metricsGranularity=DAILY`

    const response = await fetch(metricsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails: string

      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.error?.message || errorText
      } catch {
        errorDetails = errorText
      }

      // Handle specific error codes
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Script not found', details: errorDetails },
          { status: 404 }
        )
      }

      if (response.status === 403) {
        return NextResponse.json(
          {
            error: 'Permission denied. Make sure the script.metrics scope is authorized.',
            details: errorDetails
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch metrics from Google API', details: errorDetails },
        { status: response.status }
      )
    }

    const data: GoogleMetricsResponse = await response.json()

    // Transform the response to a cleaner format
    const metrics: MetricsResponse = {
      activeUsers: [],
      totalExecutions: [],
      failedExecutions: []
    }

    if (data.metrics && data.metrics.length > 0) {
      const metricsData = data.metrics[0]

      if (metricsData.activeUsers && metricsData.activeUsers.length > 0) {
        metrics.activeUsers = metricsData.activeUsers[0].values || []
      }

      if (metricsData.totalExecutions && metricsData.totalExecutions.length > 0) {
        metrics.totalExecutions = metricsData.totalExecutions[0].values || []
      }

      if (metricsData.failedExecutions && metricsData.failedExecutions.length > 0) {
        metrics.failedExecutions = metricsData.failedExecutions[0].values || []
      }
    }

    return NextResponse.json({
      scriptId,
      metrics,
      granularity: 'DAILY'
    })

  } catch (error) {
    console.error('Error fetching script metrics:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
