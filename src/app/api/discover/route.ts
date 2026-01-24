import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchScriptContent, analyzeScript, extractBaseUrl, inferApiDescription } from '@/lib/script-sync'
import type { ScriptProject } from '@/types'

// POST: Add multiple script IDs in bulk and sync them
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scripts, force = false } = body as { scripts: Array<{ id: string; name?: string }>; force?: boolean }

    if (!scripts || !Array.isArray(scripts)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { scripts: [{ id, name? }], force?: boolean }' },
        { status: 400 }
      )
    }

    const results = {
      added: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ id: string; name: string; status: string; error?: string }>
    }

    for (const scriptInfo of scripts) {
      if (!scriptInfo.id || scriptInfo.id.length < 20) {
        results.skipped++
        results.details.push({
          id: scriptInfo.id || 'unknown',
          name: scriptInfo.name || 'Unknown',
          status: 'skipped',
          error: 'Invalid script ID'
        })
        continue
      }

      try {
        // Check if already exists
        const existing = await prisma.script.findUnique({
          where: { id: scriptInfo.id }
        })

        // Skip if exists and not forcing, OR if exists with content and not forcing
        const hasContent = existing && existing.linesOfCode && existing.linesOfCode > 0
        if (existing && !force && hasContent) {
          results.skipped++
          results.details.push({
            id: scriptInfo.id,
            name: existing.name,
            status: 'exists'
          })
          continue
        }

        // If exists but no content (or forcing), we'll re-sync
        const needsResync = existing && (!hasContent || force)

        // Try to fetch and analyze the script
        const files = await fetchScriptContent(scriptInfo.id)

        if (files.length === 0) {
          // Can't access the script - just add/update as placeholder
          if (needsResync) {
            // Update existing but keep it as is if we still can't access
            results.skipped++
            results.details.push({
              id: scriptInfo.id,
              name: existing?.name || scriptInfo.name || 'Unknown Script',
              status: 'no_access',
              error: 'Could not fetch script content - may need permissions'
            })
          } else {
            await prisma.script.create({
              data: {
                id: scriptInfo.id,
                name: scriptInfo.name || 'Unknown Script',
                lastSyncedAt: new Date(),
                complexity: 'low',
                linesOfCode: 0
              }
            })

            results.added++
            results.details.push({
              id: scriptInfo.id,
              name: scriptInfo.name || 'Unknown Script',
              status: 'added_no_access',
              error: 'Could not fetch script content - may need permissions'
            })
          }
          continue
        }

        // Create project for analysis
        const project: ScriptProject = {
          scriptId: scriptInfo.id,
          name: scriptInfo.name || 'Discovered Script',
          parentId: '',
          parentName: scriptInfo.name || 'Discovered Script',
          files,
          lastSynced: new Date().toISOString()
        }

        // Analyze the code
        const analysis = analyzeScript(project)

        // Calculate workflow steps as JSON string
        const workflowSteps = analysis.functionalSummary
          ? JSON.stringify(analysis.functionalSummary.workflowSteps)
          : null

        // Prepare data for database
        const scriptData = {
          name: scriptInfo.name || project.name,
          lastSyncedAt: new Date(),
          lastAnalyzedAt: new Date(),
          functionalSummary: analysis.functionalSummary?.brief || analysis.summary,
          workflowSteps,
          complexity: analysis.complexity,
          linesOfCode: analysis.linesOfCode
        }

        // Prepare related data
        const filesData = files.map(f => ({
          name: f.name,
          type: f.type,
          content: f.source
        }))

        const apisData = (() => {
          const seen = new Set<string>()
          return analysis.externalApis.filter(api => {
            const key = `${api.url}::${api.method}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).map(api => ({
            url: api.url,
            baseUrl: extractBaseUrl(api.url),
            method: api.method,
            description: api.description || inferApiDescription(api.url),
            usageCount: api.count,
            codeLocation: api.codeLocation
          }))
        })()

        const triggersData = (() => {
          const seen = new Set<string>()
          return analysis.triggers.filter(trigger => {
            const key = `${trigger.function}::${trigger.type}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).map(trigger => ({
            type: trigger.type,
            functionName: trigger.function,
            schedule: trigger.schedule,
            scheduleDescription: trigger.scheduleDescription,
            sourceEvent: trigger.sourceEvent,
            isProgrammatic: trigger.isProgrammatic || false,
            status: 'enabled'
          }))
        })()

        const connectedFilesData = (() => {
          const seen = new Set<string>()
          return analysis.connectedSpreadsheets.filter(file => {
            if (seen.has(file.fileId)) return false
            seen.add(file.fileId)
            return true
          }).map(file => ({
            fileId: file.fileId,
            fileName: file.fileName,
            fileType: file.fileType,
            fileUrl: file.fileUrl,
            accessType: file.accessType,
            extractedFrom: file.extractedFrom,
            codeLocation: file.codeLocation
          }))
        })()

        const functionsData = (() => {
          const seen = new Set<string>()
          return analysis.functions.filter(func => {
            if (seen.has(func.name)) return false
            seen.add(func.name)
            return true
          }).map(func => ({
            name: func.name,
            description: func.description,
            parameters: JSON.stringify(func.parameters),
            isPublic: func.isPublic,
            lineCount: func.lineCount,
            fileName: func.fileName
          }))
        })()

        const googleServicesData = analysis.googleServices.map(service => ({
          serviceName: service
        }))

        // Store in database - use upsert pattern for re-syncing
        if (needsResync) {
          // Delete old related records first
          await prisma.$transaction([
            prisma.scriptFile.deleteMany({ where: { scriptId: scriptInfo.id } }),
            prisma.externalApi.deleteMany({ where: { scriptId: scriptInfo.id } }),
            prisma.trigger.deleteMany({ where: { scriptId: scriptInfo.id } }),
            prisma.connectedFile.deleteMany({ where: { scriptId: scriptInfo.id } }),
            prisma.scriptFunction.deleteMany({ where: { scriptId: scriptInfo.id } }),
            prisma.googleService.deleteMany({ where: { scriptId: scriptInfo.id } })
          ])

          // Update the script
          await prisma.script.update({
            where: { id: scriptInfo.id },
            data: {
              ...scriptData,
              files: { create: filesData },
              apis: { create: apisData },
              triggers: { create: triggersData },
              connectedFiles: { create: connectedFilesData },
              functions: { create: functionsData },
              googleServices: { create: googleServicesData }
            }
          })
        } else {
          // Create new script
          await prisma.script.create({
            data: {
              id: scriptInfo.id,
              ...scriptData,
              files: { create: filesData },
              apis: { create: apisData },
              triggers: { create: triggersData },
              connectedFiles: { create: connectedFilesData },
              functions: { create: functionsData },
              googleServices: { create: googleServicesData }
            }
          })
        }

        results.synced++
        results.details.push({
          id: scriptInfo.id,
          name: scriptInfo.name || project.name,
          status: needsResync ? 'resynced' : 'synced'
        })
      } catch (error) {
        results.failed++
        results.details.push({
          id: scriptInfo.id,
          name: scriptInfo.name || 'Unknown',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Added ${results.added}, synced ${results.synced}, skipped ${results.skipped}, failed ${results.failed}`
    })
  } catch (error) {
    console.error('Discover API error:', error)
    return NextResponse.json(
      { error: 'Failed to process scripts' },
      { status: 500 }
    )
  }
}

// GET: Return a bookmarklet/script that can be run in browser to extract script IDs
export async function GET() {
  // JavaScript that can be run in browser console at script.google.com to extract all script IDs
  const extractorScript = `
// Script ID Extractor for Apps Scripts Manager
// Run this in your browser console at https://script.google.com/home/my

(async function() {
  console.log('Starting script ID extraction...');

  const scripts = [];
  const seen = new Set();

  // Function to extract from current view
  async function extractVisible() {
    const rows = document.querySelectorAll('[role="option"]');
    console.log('Found ' + rows.length + ' project rows');

    for (const row of rows) {
      // Click on the row to select it
      row.click();
      await new Promise(r => setTimeout(r, 100));

      // Double-click to navigate (this reveals the ID in URL)
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));

      // Get script ID from URL
      const match = window.location.href.match(/projects\\/([a-zA-Z0-9_-]+)/);
      if (match && !seen.has(match[1])) {
        const name = row.textContent.trim().split('\\n')[0] || 'Unknown';
        scripts.push({ id: match[1], name: name });
        seen.add(match[1]);
        console.log('Found: ' + name + ' (' + match[1] + ')');
      }

      // Go back
      history.back();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  await extractVisible();

  // Scroll and extract more
  const listbox = document.querySelector('[role="listbox"]');
  if (listbox) {
    for (let i = 0; i < 5; i++) {
      listbox.scrollTop += 500;
      await new Promise(r => setTimeout(r, 1000));
      await extractVisible();
    }
  }

  console.log('\\n=== EXTRACTION COMPLETE ===');
  console.log('Found ' + scripts.length + ' scripts');
  console.log('\\nCopy this JSON and POST to /api/discover:');
  console.log(JSON.stringify({ scripts }, null, 2));

  // Also copy to clipboard
  try {
    await navigator.clipboard.writeText(JSON.stringify({ scripts }, null, 2));
    console.log('\\n(JSON copied to clipboard!)');
  } catch(e) {
    console.log('\\n(Could not copy to clipboard - please copy manually)');
  }

  return scripts;
})();
`.trim()

  // Simpler manual extraction script
  const manualScript = `
// SIMPLE Script ID Extractor
// Run this at https://script.google.com/home/my
// Then manually click through each project - the script will collect IDs

window._collectedScripts = window._collectedScripts || [];
window._seenIds = window._seenIds || new Set();

// Watch for URL changes
const observer = new MutationObserver(() => {
  const match = window.location.href.match(/projects\\/([a-zA-Z0-9_-]+)/);
  if (match && !window._seenIds.has(match[1])) {
    const id = match[1];
    const name = document.title.replace(' - Project Editor - Apps Script', '').trim() || 'Unknown';
    window._collectedScripts.push({ id, name });
    window._seenIds.add(id);
    console.log('Collected #' + window._collectedScripts.length + ': ' + name);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Check current URL too
const match = window.location.href.match(/projects\\/([a-zA-Z0-9_-]+)/);
if (match && !window._seenIds.has(match[1])) {
  window._collectedScripts.push({ id: match[1], name: document.title.replace(' - Project Editor - Apps Script', '').trim() });
  window._seenIds.add(match[1]);
}

console.log('Script collector active. Navigate through your projects.');
console.log('When done, run: copy(JSON.stringify({scripts: window._collectedScripts}))');
`.trim()

  return NextResponse.json({
    instructions: [
      '1. Go to https://script.google.com/home/my in your browser',
      '2. Open browser DevTools (F12 or Cmd+Option+I)',
      '3. Paste one of the scripts below in the Console tab and press Enter',
      '4. The script will collect script IDs as you browse',
      '5. POST the resulting JSON to /api/discover'
    ],
    scripts: {
      manual: manualScript,
      auto: extractorScript
    },
    example_post: {
      method: 'POST',
      url: '/api/discover',
      body: {
        scripts: [
          { id: 'YOUR_SCRIPT_ID_HERE', name: 'Script Name' }
        ]
      }
    }
  })
}
