import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DashboardStats } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get total scripts count
    const totalScripts = await prisma.script.count()

    // Get all executions with their status
    const executions = await prisma.execution.findMany({
      select: {
        status: true,
        startedAt: true
      }
    })

    // Calculate executions today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const executionsToday = executions.filter(
      e => e.startedAt >= today
    ).length

    // Calculate success rate
    const totalExecutions = executions.length
    const successfulExecutions = executions.filter(
      e => e.status === 'success'
    ).length
    const failedExecutions = executions.filter(
      e => e.status === 'error' || e.status === 'timeout'
    ).length

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 1000) / 10
      : 100

    // Get average execution time from successful executions
    const executionsWithDuration = await prisma.execution.findMany({
      where: {
        status: 'success',
        duration: { not: null }
      },
      select: {
        duration: true
      }
    })

    const avgExecutionTime = executionsWithDuration.length > 0
      ? executionsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / executionsWithDuration.length
      : 0

    // Calculate health status based on recent executions per script
    // Get the latest execution status for each script
    const scriptsWithLatestExecution = await prisma.script.findMany({
      select: {
        id: true,
        executions: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: { status: true }
        }
      }
    })

    let healthyCount = 0
    let warningCount = 0
    let errorCount = 0

    scriptsWithLatestExecution.forEach(script => {
      const latestExecution = script.executions[0]
      if (!latestExecution) {
        // No executions yet, consider healthy
        healthyCount++
      } else if (latestExecution.status === 'error' || latestExecution.status === 'timeout') {
        errorCount++
      } else if (latestExecution.status === 'warning') {
        warningCount++
      } else {
        healthyCount++
      }
    })

    const stats: DashboardStats = {
      totalScripts,
      healthyCount,
      warningCount,
      errorCount,
      executionsToday,
      successRate,
      avgExecutionTime: Math.round(avgExecutionTime * 10) / 10
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: String(error) },
      { status: 500 }
    )
  }
}
