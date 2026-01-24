import { NextRequest, NextResponse } from 'next/server'
import { getScriptClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

interface ScriptVersion {
  versionNumber: number
  description: string
  createTime: string
}

interface ScriptFile {
  name: string
  type: string
  source: string
  lastModifyUser?: {
    name?: string
    email?: string
  }
  createTime?: string
  updateTime?: string
  functionSet?: {
    values?: Array<{ name: string }>
  }
}

interface VersionsResponse {
  versions: ScriptVersion[]
  totalVersions: number
  content?: {
    scriptId: string
    files: ScriptFile[]
  }
  requestedVersion?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params
    const { searchParams } = new URL(request.url)
    const versionParam = searchParams.get('version')
    const requestedVersion = versionParam ? parseInt(versionParam, 10) : null

    const script = getScriptClient()

    // Fetch versions list
    const versionsResponse = await script.projects.versions.list({
      scriptId,
      pageSize: 100
    })

    const rawVersions = versionsResponse.data.versions || []

    // Map to our simplified version format
    const versions: ScriptVersion[] = rawVersions.map((v) => ({
      versionNumber: v.versionNumber || 0,
      description: v.description || '',
      createTime: v.createTime || ''
    }))

    // Sort by version number descending (newest first)
    versions.sort((a, b) => b.versionNumber - a.versionNumber)

    const response: VersionsResponse = {
      versions,
      totalVersions: versions.length
    }

    // If a specific version is requested, fetch its content
    if (requestedVersion !== null && !isNaN(requestedVersion)) {
      const contentResponse = await script.projects.getContent({
        scriptId,
        versionNumber: requestedVersion
      })

      const files = contentResponse.data.files || []

      response.content = {
        scriptId,
        files: files.map((f) => ({
          name: f.name || '',
          type: f.type || '',
          source: f.source || '',
          lastModifyUser: f.lastModifyUser ? {
            name: f.lastModifyUser.name || undefined,
            email: f.lastModifyUser.email || undefined
          } : undefined,
          createTime: f.createTime || undefined,
          updateTime: f.updateTime || undefined,
          functionSet: f.functionSet ? {
            values: f.functionSet.values?.map((fn) => ({
              name: fn.name || ''
            }))
          } : undefined
        }))
      }
      response.requestedVersion = requestedVersion
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error('Error fetching script versions:', error)

    // Handle specific Google API errors
    if (error && typeof error === 'object') {
      const googleError = error as { code?: number; message?: string; errors?: Array<{ message: string; reason: string }> }

      if (googleError.code === 404) {
        return NextResponse.json(
          { error: 'Script not found', details: 'The specified script ID does not exist or you do not have access to it' },
          { status: 404 }
        )
      }

      if (googleError.code === 403) {
        return NextResponse.json(
          { error: 'Access denied', details: 'You do not have permission to access this script' },
          { status: 403 }
        )
      }

      if (googleError.errors && Array.isArray(googleError.errors)) {
        const firstError = googleError.errors[0]
        if (firstError?.reason === 'notFound') {
          return NextResponse.json(
            { error: 'Version not found', details: firstError.message },
            { status: 404 }
          )
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch script versions', details: String(error) },
      { status: 500 }
    )
  }
}
