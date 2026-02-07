#!/usr/bin/env tsx
/**
 * Cleanup Stale Scripts
 * 
 * Removes scripts from the database that have invalid/deleted script IDs.
 * This prevents the execution sync from failing on every run.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-stale-scripts.ts [--dry-run]
 */

import { prisma } from '../src/lib/db'
import { getScriptClient } from '../src/lib/google-auth'

const DRY_RUN = process.argv.includes('--dry-run')

interface ValidationResult {
  id: string
  name: string
  valid: boolean
  error?: string
}

async function validateScriptId(scriptId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const scriptClient = getScriptClient()
    await scriptClient.projects.get({ scriptId })
    return { valid: true }
  } catch (error: any) {
    const message = error?.message || String(error)
    if (message.includes('404') || message.includes('invalid argument') || message.includes('not found')) {
      return { valid: false, error: 'Script not found or deleted' }
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return { valid: false, error: 'No access to script' }
    }
    // For transient errors, assume valid (don't delete on temporary error)
    return { valid: true }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log(`\n🔍 Checking for stale scripts in database...`)
  if (DRY_RUN) {
    console.log(`⚠️  DRY RUN MODE - No changes will be made\n`)
  }

  // Get all scripts from database
  const scripts = await prisma.script.findMany({
    select: { id: true, name: true, lastSyncedAt: true }
  })

  console.log(`Found ${scripts.length} scripts in database\n`)

  const results: ValidationResult[] = []
  let validCount = 0
  let staleCount = 0

  // Validate each script (with rate limiting)
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
    console.log(`[${i + 1}/${scripts.length}] Checking: ${script.name}`)

    const validation = await validateScriptId(script.id)
    
    if (validation.valid) {
      console.log(`  ✓ Valid`)
      validCount++
    } else {
      console.log(`  ✗ STALE: ${validation.error}`)
      staleCount++
    }

    results.push({
      id: script.id,
      name: script.name,
      valid: validation.valid,
      error: validation.error
    })

    // Rate limit: 600ms between calls
    if (i < scripts.length - 1) {
      await sleep(600)
    }
  }

  console.log(`\n📊 Validation Summary:`)
  console.log(`  ✓ Valid scripts: ${validCount}`)
  console.log(`  ✗ Stale scripts: ${staleCount}`)

  if (staleCount === 0) {
    console.log(`\n✅ No stale scripts found. Database is clean!`)
    return
  }

  // Get stale script IDs
  const staleScriptIds = results.filter(r => !r.valid).map(r => r.id)

  console.log(`\n🗑️  Stale scripts to remove:`)
  results.filter(r => !r.valid).forEach(r => {
    console.log(`  - ${r.name} (${r.id})`)
    console.log(`    Reason: ${r.error}`)
  })

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN: Would have deleted ${staleCount} scripts`)
    console.log(`Run without --dry-run to actually delete them`)
    return
  }

  // Confirm deletion
  console.log(`\n⚠️  This will delete ${staleCount} scripts and all their related data:`)
  console.log(`  - Script files`)
  console.log(`  - Executions`)
  console.log(`  - Functions`)
  console.log(`  - APIs`)
  console.log(`  - Triggers`)
  console.log(`  - Connected files`)

  // Auto-confirm in non-interactive mode
  console.log(`\n🗑️  Deleting stale scripts...`)

  try {
    const deleteResult = await prisma.script.deleteMany({
      where: {
        id: { in: staleScriptIds }
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} scripts`)
    console.log(`\n💡 Next steps:`)
    console.log(`  1. Run execution sync again: POST /api/sync/executions`)
    console.log(`  2. Verify no more stale script errors in logs`)
    console.log(`  3. Consider scheduling this cleanup script weekly`)
  } catch (error) {
    console.error(`\n❌ Failed to delete scripts:`, error)
    throw error
  }
}

main()
  .then(() => {
    console.log(`\n✅ Cleanup complete`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Cleanup failed:`, error)
    process.exit(1)
  })
