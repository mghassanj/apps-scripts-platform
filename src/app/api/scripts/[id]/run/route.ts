import { NextRequest, NextResponse } from 'next/server'
import { getScriptClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

interface RunRequestBody {
  functionName: string
  parameters?: unknown[]
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Error codes from the Apps Script API
 * @see https://developers.google.com/apps-script/api/reference/rest/v1/scripts/run#executionerror
 */
interface ExecutionError {
  scriptStackTraceElements?: Array<{
    function: string
    lineNumber: number
  }>
  errorMessage: string
  errorType: string
}

interface ScriptExecutionResponse {
  done?: boolean
  error?: {
    code: number
    message: string
    status: string
    details?: Array<{
      '@type': string
      errorMessage?: string
      errorType?: string
      scriptStackTraceElements?: Array<{
        function: string
        lineNumber: number
      }>
    }>
  }
  response?: {
    '@type': string
    result?: unknown
    executionId?: string
  }
}

/**
 * Maps Google API error codes to user-friendly messages
 */
function getErrorDetails(error: ScriptExecutionResponse['error']): {
  message: string
  type: string
  suggestion: string
} {
  if (!error) {
    return {
      message: 'Unknown error occurred',
      type: 'UNKNOWN',
      suggestion: 'Please try again or check the script configuration.'
    }
  }

  const errorCode = error.code
  const errorMessage = error.message || 'Unknown error'

  // Check for execution errors in details
  const executionError = error.details?.find(
    d => d['@type'] === 'type.googleapis.com/google.apps.script.v1.ExecutionError'
  )

  if (executionError) {
    return {
      message: executionError.errorMessage || errorMessage,
      type: executionError.errorType || 'EXECUTION_ERROR',
      suggestion: getExecutionErrorSuggestion(executionError.errorType)
    }
  }

  // Handle common API-level errors
  switch (errorCode) {
    case 400:
      if (errorMessage.includes('INVALID_ARGUMENT')) {
        return {
          message: errorMessage,
          type: 'INVALID_ARGUMENT',
          suggestion: 'Check that the function name and parameters are correct.'
        }
      }
      break
    case 401:
      return {
        message: 'Authentication failed',
        type: 'UNAUTHENTICATED',
        suggestion: 'The OAuth token may have expired. Please re-authenticate.'
      }
    case 403:
      if (errorMessage.includes('PERMISSION_DENIED')) {
        return {
          message: 'Permission denied to execute this script',
          type: 'PERMISSION_DENIED',
          suggestion: 'Ensure the script is deployed as an API executable and you have execute permissions.'
        }
      }
      if (errorMessage.includes('ACCESS_NOT_CONFIGURED')) {
        return {
          message: 'Apps Script API is not enabled',
          type: 'ACCESS_NOT_CONFIGURED',
          suggestion: 'Enable the Apps Script API in the Google Cloud Console for your project.'
        }
      }
      break
    case 404:
      return {
        message: 'Script not found or not deployed as API executable',
        type: 'NOT_FOUND',
        suggestion: 'Ensure the script exists and is deployed as an API executable (not a web app).'
      }
    case 429:
      return {
        message: 'Rate limit exceeded',
        type: 'RESOURCE_EXHAUSTED',
        suggestion: 'Too many requests. Please wait before trying again.'
      }
    case 500:
      return {
        message: 'Internal error in Apps Script',
        type: 'INTERNAL',
        suggestion: 'An error occurred in Google Apps Script. Please try again later.'
      }
    case 503:
      return {
        message: 'Service temporarily unavailable',
        type: 'UNAVAILABLE',
        suggestion: 'Google Apps Script service is temporarily unavailable. Please try again later.'
      }
    case 504:
      return {
        message: 'Execution timeout',
        type: 'DEADLINE_EXCEEDED',
        suggestion: 'The function took too long to execute. Consider optimizing the function or breaking it into smaller operations.'
      }
  }

  return {
    message: errorMessage,
    type: error.status || 'UNKNOWN',
    suggestion: 'Check the script logs in the Apps Script editor for more details.'
  }
}

/**
 * Get suggestion based on execution error type
 */
function getExecutionErrorSuggestion(errorType?: string): string {
  switch (errorType) {
    case 'EXCEPTION':
      return 'The function threw an exception. Check the error message and script logs for details.'
    case 'TIMEOUT':
      return 'The function exceeded the maximum execution time. Consider optimizing the code or splitting into smaller operations.'
    case 'SCRIPT_LOCKED':
      return 'Another instance of this script is currently running. Wait for it to complete and try again.'
    case 'SYSTEM_ERROR':
      return 'A system error occurred in Google Apps Script. Please try again later.'
    default:
      return 'Check the Apps Script editor logs for more information.'
  }
}

/**
 * POST /api/scripts/[id]/run
 *
 * Executes a function in a Google Apps Script project using the Apps Script API.
 *
 * Request body:
 * {
 *   "functionName": "myFunction",    // Required: Name of the function to execute
 *   "parameters": [arg1, arg2, ...]  // Optional: Array of parameters to pass
 * }
 *
 * Requirements:
 * - The script must be deployed as an API executable (not a web app)
 * - The OAuth token must have the required scopes
 * - The function must be a top-level function (not a private function)
 *
 * Response on success:
 * {
 *   "success": true,
 *   "result": <function return value>,
 *   "executionId": "string"
 * }
 *
 * Response on error:
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Error description",
 *     "type": "ERROR_TYPE",
 *     "suggestion": "How to fix",
 *     "stackTrace": [...] // If available
 *   }
 * }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: scriptId } = await context.params

    // Parse and validate request body
    let body: RunRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            type: 'INVALID_REQUEST',
            suggestion: 'Ensure the request body is valid JSON with a "functionName" field.'
          }
        },
        { status: 400 }
      )
    }

    // Validate function name
    if (!body.functionName || typeof body.functionName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Missing or invalid functionName',
            type: 'INVALID_REQUEST',
            suggestion: 'Provide a valid "functionName" string in the request body.'
          }
        },
        { status: 400 }
      )
    }

    // Validate parameters if provided
    if (body.parameters !== undefined && !Array.isArray(body.parameters)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Parameters must be an array',
            type: 'INVALID_REQUEST',
            suggestion: 'Provide "parameters" as an array, e.g., ["arg1", 123, true].'
          }
        },
        { status: 400 }
      )
    }

    // Get the Apps Script API client
    const scriptClient = getScriptClient()

    // Execute the function
    // Using devMode: true to run against HEAD deployment (for testing/development)
    const response = await scriptClient.scripts.run({
      scriptId,
      requestBody: {
        function: body.functionName,
        parameters: body.parameters || [],
        devMode: true // Run against HEAD deployment
      }
    })

    const data = response.data as ScriptExecutionResponse

    // Check for execution errors
    if (data.error) {
      const errorDetails = getErrorDetails(data.error)

      // Extract stack trace if available
      const stackTrace = data.error.details?.find(
        d => d['@type'] === 'type.googleapis.com/google.apps.script.v1.ExecutionError'
      )?.scriptStackTraceElements

      return NextResponse.json(
        {
          success: false,
          error: {
            message: errorDetails.message,
            type: errorDetails.type,
            suggestion: errorDetails.suggestion,
            stackTrace: stackTrace || undefined
          }
        },
        { status: getHttpStatusFromErrorType(errorDetails.type) }
      )
    }

    // Check if execution completed successfully
    if (data.done && data.response) {
      return NextResponse.json({
        success: true,
        result: data.response.result,
        executionId: data.response.executionId
      })
    }

    // Execution started but not yet complete (shouldn't happen with synchronous execution)
    return NextResponse.json({
      success: true,
      result: null,
      message: 'Execution started',
      executionId: data.response?.executionId
    })
  } catch (error: unknown) {
    console.error('Error executing script function:', error)

    // Handle Google API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as { code: number; message?: string; errors?: Array<{ message: string; reason: string }> }
      const errorDetails = getErrorDetails({
        code: apiError.code,
        message: apiError.message || apiError.errors?.[0]?.message || 'Unknown error',
        status: apiError.errors?.[0]?.reason || 'UNKNOWN'
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            message: errorDetails.message,
            type: errorDetails.type,
            suggestion: errorDetails.suggestion
          }
        },
        { status: apiError.code >= 400 && apiError.code < 600 ? apiError.code : 500 }
      )
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check for common configuration errors
    if (errorMessage.includes('credentials') || errorMessage.includes('token')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication configuration error',
            type: 'AUTH_CONFIG_ERROR',
            suggestion: 'Check that Google OAuth credentials are properly configured in .clasprc.json or environment variables.'
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to execute script function',
          type: 'INTERNAL_ERROR',
          suggestion: 'Check server logs for more details.',
          details: errorMessage
        }
      },
      { status: 500 }
    )
  }
}

/**
 * Maps error types to appropriate HTTP status codes
 */
function getHttpStatusFromErrorType(errorType: string): number {
  switch (errorType) {
    case 'INVALID_ARGUMENT':
    case 'INVALID_REQUEST':
      return 400
    case 'UNAUTHENTICATED':
      return 401
    case 'PERMISSION_DENIED':
    case 'ACCESS_NOT_CONFIGURED':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'RESOURCE_EXHAUSTED':
      return 429
    case 'DEADLINE_EXCEEDED':
      return 504
    case 'UNAVAILABLE':
      return 503
    default:
      return 500
  }
}
