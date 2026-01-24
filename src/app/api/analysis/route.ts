import { NextResponse } from 'next/server'
import { getAllAnalyses } from '@/lib/script-sync'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const ANALYSIS_DIR = path.join(process.cwd(), 'script-analysis')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scriptName = searchParams.get('name')

  try {
    if (scriptName) {
      // Get specific analysis
      const sanitizedName = scriptName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)
      const analysisPath = path.join(ANALYSIS_DIR, `${sanitizedName}.json`)

      if (fs.existsSync(analysisPath)) {
        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'))
        return NextResponse.json(analysis)
      }

      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Get all analyses
    const analyses = getAllAnalyses()

    // Generate aggregate stats
    const stats = {
      totalScripts: analyses.length,
      totalFunctions: analyses.reduce((sum, a) => sum + a.functions.length, 0),
      totalLinesOfCode: analyses.reduce((sum, a) => sum + a.linesOfCode, 0),
      totalExternalApis: new Set(analyses.flatMap(a => a.externalApis.map(api => api.url))).size,
      complexityDistribution: {
        low: analyses.filter(a => a.complexity === 'low').length,
        medium: analyses.filter(a => a.complexity === 'medium').length,
        high: analyses.filter(a => a.complexity === 'high').length
      },
      mostUsedServices: getMostUsedServices(analyses),
      commonSuggestions: getCommonSuggestions(analyses)
    }

    return NextResponse.json({
      stats,
      analyses: analyses.map(a => ({
        name: a.name,
        scriptId: a.scriptId,
        summary: a.summary,
        complexity: a.complexity,
        linesOfCode: a.linesOfCode,
        functionCount: a.functions.length,
        apiCount: a.externalApis.length,
        googleServices: a.googleServices,
        triggerCount: a.triggers.length,
        suggestionCount: a.suggestions.length,
        lastAnalyzed: a.lastAnalyzed
      }))
    })
  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to get analysis', details: String(error) },
      { status: 500 }
    )
  }
}

function getMostUsedServices(analyses: any[]): { name: string; count: number }[] {
  const serviceCounts: Map<string, number> = new Map()

  for (const analysis of analyses) {
    for (const service of analysis.googleServices) {
      serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1)
    }
  }

  return Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getCommonSuggestions(analyses: any[]): { suggestion: string; count: number }[] {
  const suggestionCounts: Map<string, number> = new Map()

  for (const analysis of analyses) {
    for (const suggestion of analysis.suggestions) {
      // Normalize suggestion for grouping
      const normalized = suggestion.split(':')[0]
      suggestionCounts.set(normalized, (suggestionCounts.get(normalized) || 0) + 1)
    }
  }

  return Array.from(suggestionCounts.entries())
    .map(([suggestion, count]) => ({ suggestion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
