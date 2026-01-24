#!/usr/bin/env npx ts-node

/**
 * Script to sync and analyze all Google Apps Scripts locally
 * Run with: npx ts-node scripts/sync-scripts.ts
 * Or set up as a cron job for hourly sync
 */

import { syncAllScripts, analyzeScript, getSyncStatus } from '../src/lib/script-sync'

async function main() {
  console.log('='.repeat(50))
  console.log('Google Apps Script Sync & Analysis')
  console.log('Started at:', new Date().toISOString())
  console.log('='.repeat(50))

  try {
    // Check last sync
    const lastStatus = getSyncStatus()
    if (lastStatus) {
      console.log('\nLast sync:', lastStatus.lastSync)
      console.log('Previously synced:', lastStatus.synced, 'scripts')
    }

    // Sync all scripts
    console.log('\n📥 Syncing scripts from Google...')
    const result = await syncAllScripts()

    console.log(`\n✅ Synced: ${result.synced} scripts`)
    if (result.failed > 0) {
      console.log(`⚠️  Failed: ${result.failed} scripts`)
    }

    // Analyze each synced project
    console.log('\n🔍 Analyzing scripts...')
    let analyzed = 0
    let totalFunctions = 0
    let totalApis = 0
    let suggestions: string[] = []

    for (const project of result.projects) {
      try {
        const analysis = analyzeScript(project)
        analyzed++
        totalFunctions += analysis.functions.length
        totalApis += analysis.externalApis.length
        suggestions.push(...analysis.suggestions)

        console.log(`  ✓ ${project.name} (${analysis.linesOfCode} lines, ${analysis.complexity} complexity)`)
      } catch (err) {
        console.error(`  ✗ Failed to analyze ${project.name}:`, err)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('SUMMARY')
    console.log('='.repeat(50))
    console.log(`Scripts analyzed: ${analyzed}`)
    console.log(`Total functions: ${totalFunctions}`)
    console.log(`External APIs found: ${totalApis}`)
    console.log(`Improvement suggestions: ${suggestions.length}`)

    if (suggestions.length > 0) {
      console.log('\n📋 Common Suggestions:')
      const uniqueSuggestions = [...new Set(suggestions)]
      uniqueSuggestions.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s}`)
      })
    }

    console.log('\n✨ Sync complete at:', new Date().toISOString())

  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    process.exit(1)
  }
}

main()
