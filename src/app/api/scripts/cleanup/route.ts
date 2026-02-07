import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getScriptClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

// Helper: sleep for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// POST: Audit and clean stale script IDs from the database
export async function POST() {
  try {
    const scriptClient = getScriptClient()

    const scripts = await prisma.script.findMany({
      select: { id: true, name: true }
    })

    console.log(`Auditing ${scripts.length} scripts for stale IDs...`)

    const valid: string[] = []
    const stale: Array<{ id: string; name: string; reason: string }> = []
    const errors: Array<{ id: string; name: string; error: string }> = []

    for (const script of scripts) {
      try {
        await scriptClient.projects.get({ scriptId: script.id })
        valid.push(script.id)
        console.log(`  ✓ ${script.name}`)
      } catch (error: any) {
        const message = error?.message || String(error)
        if (message.includes('404') || message.includes('invalid argument') || message.includes('not found')) {
          stale.push({ id: script.id, name: script.name, reason: 'Script not found or deleted' })
          console.log(`  ✗ STALE: ${script.name} — not found`)
        } else if (message.includes('403') || message.includes('forbidden')) {
          stale.push({ id: script.id, name: script.name, reason: 'No access (permission denied)' })
          console.log(`  ✗ STALE: ${script.name} — no access`)
        } else if (message.includes('429') || message.includes('quota')) {
          errors.push({ id: script.id, name: script.name, error: 'Rate limited — try again later' })
          console.log(`  ? RATE LIMITED: ${script.name}`)
        } else {
          errors.push({ id: script.id, name: script.name, error: message })
          console.log(`  ? ERROR: ${script.name} — ${message}`)
        }
      }

      // Rate limit: 600ms between calls
      await sleep(600)
    }

    // Remove stale scripts and their related data (cascade)
    let removed = 0
    if (stale.length > 0) {
      for (const s of stale) {
        await prisma.script.delete({ where: { id: s.id } })
        removed++
        console.log(`  Removed: ${s.name} (${s.id})`)
      }
    }

    const result = {
      total: scripts.length,
      valid: valid.length,
      stale: stale.length,
      removed,
      errors: errors.length,
      details: { valid: valid.length, stale, errors },
      timestamp: new Date().toISOString()
    }

    console.log(`\nAudit complete: ${valid.length} valid, ${stale.length} stale (removed), ${errors.length} errors`)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Script cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean scripts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// GET: Dry-run audit — show stale scripts without removing them
export async function GET() {
  try {
    const scriptClient = getScriptClient()

    const scripts = await prisma.script.findMany({
      select: { id: true, name: true }
    })

    const valid: string[] = []
    const stale: Array<{ id: string; name: string; reason: string }> = []

    for (const script of scripts) {
      try {
        await scriptClient.projects.get({ scriptId: script.id })
        valid.push(script.id)
      } catch (error: any) {
        const message = error?.message || String(error)
        if (message.includes('404') || message.includes('invalid argument') || message.includes('not found')) {
          stale.push({ id: script.id, name: script.name, reason: 'Not found / deleted' })
        } else if (message.includes('403') || message.includes('forbidden')) {
          stale.push({ id: script.id, name: script.name, reason: 'No access' })
        }
      }
      await sleep(600)
    }

    return NextResponse.json({
      dryRun: true,
      total: scripts.length,
      valid: valid.length,
      stale: stale.length,
      staleScripts: stale,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to audit scripts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
