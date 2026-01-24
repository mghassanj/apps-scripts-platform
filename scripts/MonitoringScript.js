/**
 * Apps Script Execution Monitoring System
 *
 * This script monitors and logs execution data from all Apps Scripts.
 * It creates a Google Sheet to store execution logs and exposes a web app
 * endpoint for fetching execution data.
 *
 * ============================================================================
 * SETUP INSTRUCTIONS
 * ============================================================================
 *
 * 1. Create a new Google Apps Script project:
 *    - Go to https://script.google.com
 *    - Create a new project named "Execution Monitor"
 *
 * 2. Deploy via clasp (recommended):
 *    a. Install clasp: npm install -g @google/clasp
 *    b. Login: clasp login
 *    c. Create .clasp.json in this directory with:
 *       {
 *         "scriptId": "YOUR_SCRIPT_ID",
 *         "rootDir": "./scripts"
 *       }
 *    d. Push: clasp push
 *
 * 3. Enable required APIs in Google Cloud Console:
 *    - Apps Script API (script.googleapis.com)
 *    - Google Sheets API (sheets.googleapis.com)
 *    - Google Drive API (drive.googleapis.com)
 *
 * 4. Set up the monitoring sheet:
 *    - Run setupMonitoringSheet() once to create the sheet
 *    - Note the SHEET_ID from the logs
 *
 * 5. Set up time-driven trigger:
 *    - Run createHourlyTrigger() once to set up automatic syncing
 *
 * 6. Deploy as web app:
 *    - Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone (or your organization)
 *    - Copy the web app URL
 *
 * 7. Configuration:
 *    - Set SHEET_ID below after running setupMonitoringSheet()
 *    - Set WEB_APP_URL after deploying as web app
 *
 * ============================================================================
 * USAGE FROM OTHER SCRIPTS
 * ============================================================================
 *
 * To log executions from other scripts, add this to your scripts:
 *
 * function logExecution(functionName, status, errorMessage) {
 *   const monitoringUrl = 'YOUR_WEB_APP_URL';
 *   const payload = {
 *     action: 'log',
 *     scriptId: ScriptApp.getScriptId(),
 *     scriptName: 'Your Script Name',
 *     functionName: functionName,
 *     status: status,
 *     errorMessage: errorMessage || ''
 *   };
 *
 *   UrlFetchApp.fetch(monitoringUrl, {
 *     method: 'post',
 *     contentType: 'application/json',
 *     payload: JSON.stringify(payload)
 *   });
 * }
 *
 * // Usage:
 * function yourFunction() {
 *   const startTime = new Date();
 *   try {
 *     // Your code here
 *     logExecution('yourFunction', 'success');
 *   } catch (error) {
 *     logExecution('yourFunction', 'error', error.message);
 *     throw error;
 *   }
 * }
 *
 * ============================================================================
 */

// Configuration - Update these after initial setup
const CONFIG = {
  // The ID of the monitoring spreadsheet (set after running setupMonitoringSheet)
  SHEET_ID: '',

  // The web app URL (set after deploying as web app)
  WEB_APP_URL: '',

  // Sheet names
  EXECUTIONS_SHEET: 'Execution Log',
  SCRIPTS_SHEET: 'Scripts',

  // Maximum rows to keep in the log (older entries will be archived/deleted)
  MAX_LOG_ROWS: 10000,

  // API key for authentication (optional - set for additional security)
  API_KEY: ''
};

/**
 * Sets up the monitoring spreadsheet with required sheets and headers
 * Run this once to initialize the system
 */
function setupMonitoringSheet() {
  let spreadsheet;

  if (CONFIG.SHEET_ID) {
    // Open existing spreadsheet
    spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  } else {
    // Create new spreadsheet
    spreadsheet = SpreadsheetApp.create('Apps Scripts Execution Log');
    Logger.log('Created new spreadsheet with ID: ' + spreadsheet.getId());
    Logger.log('Update CONFIG.SHEET_ID with this value!');
  }

  // Set up Execution Log sheet
  let execSheet = spreadsheet.getSheetByName(CONFIG.EXECUTIONS_SHEET);
  if (!execSheet) {
    execSheet = spreadsheet.insertSheet(CONFIG.EXECUTIONS_SHEET);
  }

  // Set headers for execution log
  const execHeaders = [
    'ID',
    'Script ID',
    'Script Name',
    'Function Name',
    'Start Time',
    'End Time',
    'Duration (seconds)',
    'Status',
    'Error Message',
    'Timestamp'
  ];
  execSheet.getRange(1, 1, 1, execHeaders.length).setValues([execHeaders]);
  execSheet.getRange(1, 1, 1, execHeaders.length).setFontWeight('bold');
  execSheet.setFrozenRows(1);

  // Set up Scripts sheet for tracking known scripts
  let scriptsSheet = spreadsheet.getSheetByName(CONFIG.SCRIPTS_SHEET);
  if (!scriptsSheet) {
    scriptsSheet = spreadsheet.insertSheet(CONFIG.SCRIPTS_SHEET);
  }

  const scriptsHeaders = [
    'Script ID',
    'Script Name',
    'Last Execution',
    'Total Executions',
    'Success Count',
    'Error Count',
    'Avg Duration (s)'
  ];
  scriptsSheet.getRange(1, 1, 1, scriptsHeaders.length).setValues([scriptsHeaders]);
  scriptsSheet.getRange(1, 1, 1, scriptsHeaders.length).setFontWeight('bold');
  scriptsSheet.setFrozenRows(1);

  // Delete default Sheet1 if it exists
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  Logger.log('Monitoring sheet setup complete!');
  Logger.log('Spreadsheet URL: ' + spreadsheet.getUrl());

  return spreadsheet.getId();
}

/**
 * Creates an hourly trigger to sync execution data
 * Run this once to set up automatic syncing
 */
function createHourlyTrigger() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'syncExecutionData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create new hourly trigger
  ScriptApp.newTrigger('syncExecutionData')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Hourly trigger created for syncExecutionData');
}

/**
 * Logs an execution to the monitoring sheet
 * Can be called directly or via web app endpoint
 *
 * @param {Object} executionData - Execution data object
 * @param {string} executionData.scriptId - The script ID
 * @param {string} executionData.scriptName - Human-readable script name
 * @param {string} executionData.functionName - Name of the executed function
 * @param {Date} executionData.startTime - Execution start time
 * @param {Date} executionData.endTime - Execution end time
 * @param {string} executionData.status - success | error | warning
 * @param {string} executionData.errorMessage - Error message if applicable
 */
function logExecution(executionData) {
  if (!CONFIG.SHEET_ID) {
    throw new Error('SHEET_ID not configured. Run setupMonitoringSheet() first.');
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const execSheet = spreadsheet.getSheetByName(CONFIG.EXECUTIONS_SHEET);

  const now = new Date();
  const startTime = executionData.startTime || now;
  const endTime = executionData.endTime || now;
  const duration = (endTime - startTime) / 1000; // seconds

  // Generate unique ID
  const id = Utilities.getUuid();

  // Append new row
  const row = [
    id,
    executionData.scriptId || '',
    executionData.scriptName || 'Unknown',
    executionData.functionName || 'unknown',
    startTime,
    endTime,
    duration.toFixed(2),
    executionData.status || 'success',
    executionData.errorMessage || '',
    now
  ];

  execSheet.appendRow(row);

  // Update script statistics
  updateScriptStats(executionData.scriptId, executionData.scriptName,
                    executionData.status, duration);

  // Cleanup old rows if needed
  cleanupOldRows(execSheet);

  return id;
}

/**
 * Updates script statistics in the Scripts sheet
 */
function updateScriptStats(scriptId, scriptName, status, duration) {
  if (!scriptId) return;

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const scriptsSheet = spreadsheet.getSheetByName(CONFIG.SCRIPTS_SHEET);
  const data = scriptsSheet.getDataRange().getValues();

  // Find existing script row
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === scriptId) {
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }

  const now = new Date();

  if (rowIndex > 0) {
    // Update existing row
    const currentRow = data[rowIndex - 1];
    const totalExec = (currentRow[3] || 0) + 1;
    const successCount = (currentRow[4] || 0) + (status === 'success' ? 1 : 0);
    const errorCount = (currentRow[5] || 0) + (status === 'error' ? 1 : 0);
    const currentAvg = currentRow[6] || 0;
    const newAvg = ((currentAvg * (totalExec - 1)) + duration) / totalExec;

    scriptsSheet.getRange(rowIndex, 3, 1, 5).setValues([[
      now,
      totalExec,
      successCount,
      errorCount,
      newAvg.toFixed(2)
    ]]);
  } else {
    // Add new script row
    scriptsSheet.appendRow([
      scriptId,
      scriptName || 'Unknown',
      now,
      1,
      status === 'success' ? 1 : 0,
      status === 'error' ? 1 : 0,
      duration.toFixed(2)
    ]);
  }
}

/**
 * Cleans up old rows when log exceeds maximum size
 */
function cleanupOldRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > CONFIG.MAX_LOG_ROWS + 1) { // +1 for header
    const rowsToDelete = lastRow - CONFIG.MAX_LOG_ROWS - 1;
    sheet.deleteRows(2, rowsToDelete); // Start from row 2 to keep header
    Logger.log(`Cleaned up ${rowsToDelete} old log rows`);
  }
}

/**
 * Fetches execution logs from the Apps Script API for all scripts
 * This syncs data from the actual Apps Script execution history
 */
function syncExecutionData() {
  Logger.log('Starting execution data sync...');

  // Get list of all script projects owned by the user
  const scriptProjects = listScriptProjects();

  let totalSynced = 0;

  for (const project of scriptProjects) {
    try {
      const executions = getScriptExecutions(project.scriptId);

      for (const exec of executions) {
        // Check if already logged (by checking recent entries)
        if (!isAlreadyLogged(exec)) {
          logExecution({
            scriptId: project.scriptId,
            scriptName: project.title,
            functionName: exec.functionName,
            startTime: new Date(exec.startTime),
            endTime: exec.endTime ? new Date(exec.endTime) : new Date(),
            status: mapExecutionState(exec.state),
            errorMessage: exec.error ? exec.error.message : ''
          });
          totalSynced++;
        }
      }
    } catch (error) {
      Logger.log(`Error syncing ${project.title}: ${error.message}`);
    }
  }

  Logger.log(`Sync complete. ${totalSynced} new executions logged.`);
  return totalSynced;
}

/**
 * Lists all Apps Script projects accessible to the user
 * Uses the Apps Script API
 */
function listScriptProjects() {
  const projects = [];

  try {
    // Use Drive API to find all script files
    const response = Drive.Files.list({
      q: "mimeType='application/vnd.google-apps.script'",
      fields: 'files(id, name)',
      pageSize: 100
    });

    if (response.files) {
      for (const file of response.files) {
        projects.push({
          scriptId: file.id,
          title: file.name
        });
      }
    }
  } catch (error) {
    Logger.log('Error listing script projects: ' + error.message);
  }

  return projects;
}

/**
 * Gets recent executions for a specific script using Apps Script API
 *
 * @param {string} scriptId - The script ID
 * @returns {Array} Array of execution objects
 */
function getScriptExecutions(scriptId) {
  const executions = [];

  try {
    // Use Apps Script API to get execution history
    // Note: This requires the script.processes scope
    const url = `https://script.googleapis.com/v1/processes?scriptId=${scriptId}&pageSize=50`;

    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.processes) {
        for (const process of data.processes) {
          executions.push({
            functionName: process.functionName || 'unknown',
            startTime: process.startTime,
            endTime: process.endTime,
            state: process.processStatus,
            error: process.error,
            userAccessLevel: process.userAccessLevel,
            processType: process.processType
          });
        }
      }
    } else {
      Logger.log(`API error for ${scriptId}: ${response.getContentText()}`);
    }
  } catch (error) {
    Logger.log(`Error fetching executions for ${scriptId}: ${error.message}`);
  }

  return executions;
}

/**
 * Maps Apps Script execution state to our status format
 */
function mapExecutionState(state) {
  const stateMap = {
    'COMPLETED': 'success',
    'FAILED': 'error',
    'TIMED_OUT': 'error',
    'CANCELED': 'warning',
    'UNKNOWN': 'warning',
    'RUNNING': 'success'
  };

  return stateMap[state] || 'warning';
}

/**
 * Checks if an execution has already been logged
 * Uses a simple check of recent entries
 */
function isAlreadyLogged(exec) {
  if (!CONFIG.SHEET_ID) return false;

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const execSheet = spreadsheet.getSheetByName(CONFIG.EXECUTIONS_SHEET);
  const lastRow = execSheet.getLastRow();

  if (lastRow <= 1) return false;

  // Check last 100 entries for duplicate
  const startRow = Math.max(2, lastRow - 99);
  const numRows = lastRow - startRow + 1;
  const recentData = execSheet.getRange(startRow, 4, numRows, 2).getValues(); // Function name and start time

  const execStartTime = new Date(exec.startTime).getTime();

  for (const row of recentData) {
    if (row[0] === exec.functionName) {
      const loggedTime = new Date(row[1]).getTime();
      // Within 1 second is considered duplicate
      if (Math.abs(loggedTime - execStartTime) < 1000) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets recent executions from the log sheet
 *
 * @param {number} limit - Maximum number of records to return
 * @param {string} status - Filter by status (optional)
 * @param {string} scriptId - Filter by script ID (optional)
 * @returns {Array} Array of execution records
 */
function getRecentExecutions(limit = 100, status = null, scriptId = null) {
  if (!CONFIG.SHEET_ID) {
    throw new Error('SHEET_ID not configured. Run setupMonitoringSheet() first.');
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const execSheet = spreadsheet.getSheetByName(CONFIG.EXECUTIONS_SHEET);
  const lastRow = execSheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  // Get all data (excluding header)
  const data = execSheet.getRange(2, 1, lastRow - 1, 10).getValues();

  // Convert to objects and filter
  let executions = data.map(row => ({
    id: row[0],
    scriptId: row[1],
    scriptName: row[2],
    functionName: row[3],
    startTime: row[4],
    endTime: row[5],
    duration: parseFloat(row[6]),
    status: row[7],
    errorMessage: row[8],
    timestamp: row[9]
  }));

  // Apply filters
  if (status) {
    executions = executions.filter(e => e.status === status);
  }

  if (scriptId) {
    executions = executions.filter(e => e.scriptId === scriptId);
  }

  // Sort by timestamp descending and limit
  executions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  executions = executions.slice(0, limit);

  return executions;
}

/**
 * Gets execution statistics
 *
 * @param {number} hours - Number of hours to look back (default 24)
 * @returns {Object} Statistics object
 */
function getExecutionStats(hours = 24) {
  const executions = getRecentExecutions(10000); // Get enough data
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Filter to time window
  const recentExecs = executions.filter(e => new Date(e.timestamp) >= cutoffTime);

  const stats = {
    totalExecutions: recentExecs.length,
    successCount: recentExecs.filter(e => e.status === 'success').length,
    errorCount: recentExecs.filter(e => e.status === 'error').length,
    warningCount: recentExecs.filter(e => e.status === 'warning').length,
    avgDuration: 0,
    successRate: 0,
    uniqueScripts: new Set(recentExecs.map(e => e.scriptId)).size,
    timeWindow: hours
  };

  if (recentExecs.length > 0) {
    stats.avgDuration = recentExecs.reduce((sum, e) => sum + e.duration, 0) / recentExecs.length;
    stats.successRate = (stats.successCount / recentExecs.length) * 100;
  }

  return stats;
}

/**
 * Web app entry point for GET requests
 * Returns execution data as JSON
 *
 * Query parameters:
 * - action: 'list' | 'stats' | 'sync'
 * - limit: number of records (default 100)
 * - status: filter by status
 * - scriptId: filter by script ID
 * - hours: for stats, time window in hours
 */
function doGet(e) {
  // Optional API key check
  if (CONFIG.API_KEY && e.parameter.apiKey !== CONFIG.API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action || 'list';

  try {
    let result;

    switch (action) {
      case 'list':
        const limit = parseInt(e.parameter.limit) || 100;
        const status = e.parameter.status || null;
        const scriptId = e.parameter.scriptId || null;
        result = {
          executions: getRecentExecutions(limit, status, scriptId),
          timestamp: new Date().toISOString()
        };
        break;

      case 'stats':
        const hours = parseInt(e.parameter.hours) || 24;
        result = {
          stats: getExecutionStats(hours),
          timestamp: new Date().toISOString()
        };
        break;

      case 'sync':
        const synced = syncExecutionData();
        result = {
          message: 'Sync complete',
          newExecutions: synced,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        result = {
          error: 'Unknown action',
          validActions: ['list', 'stats', 'sync']
        };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web app entry point for POST requests
 * Used for logging executions from other scripts
 *
 * Expected payload:
 * {
 *   action: 'log',
 *   scriptId: string,
 *   scriptName: string,
 *   functionName: string,
 *   startTime: ISO date string,
 *   endTime: ISO date string,
 *   status: 'success' | 'error' | 'warning',
 *   errorMessage: string (optional)
 * }
 */
function doPost(e) {
  // Optional API key check
  const payload = JSON.parse(e.postData.contents);

  if (CONFIG.API_KEY && payload.apiKey !== CONFIG.API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (payload.action === 'log') {
      const id = logExecution({
        scriptId: payload.scriptId,
        scriptName: payload.scriptName,
        functionName: payload.functionName,
        startTime: payload.startTime ? new Date(payload.startTime) : new Date(),
        endTime: payload.endTime ? new Date(payload.endTime) : new Date(),
        status: payload.status || 'success',
        errorMessage: payload.errorMessage
      });

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        id: id,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      error: 'Unknown action',
      validActions: ['log']
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function to verify setup
 */
function testSetup() {
  // Test logging
  const testId = logExecution({
    scriptId: 'test-script-123',
    scriptName: 'Test Script',
    functionName: 'testFunction',
    startTime: new Date(Date.now() - 5000),
    endTime: new Date(),
    status: 'success',
    errorMessage: ''
  });

  Logger.log('Test execution logged with ID: ' + testId);

  // Test retrieval
  const recent = getRecentExecutions(5);
  Logger.log('Recent executions: ' + JSON.stringify(recent, null, 2));

  // Test stats
  const stats = getExecutionStats(24);
  Logger.log('Stats: ' + JSON.stringify(stats, null, 2));

  return 'Setup test complete!';
}

/**
 * Helper function to create a wrapper for any function to auto-log executions
 *
 * Usage:
 * const wrappedFunction = createLoggingWrapper('myFunction', myFunction);
 *
 * @param {string} functionName - Name of the function
 * @param {Function} fn - The function to wrap
 * @param {string} scriptName - Name of the script (optional)
 * @returns {Function} Wrapped function that logs execution
 */
function createLoggingWrapper(functionName, fn, scriptName) {
  return function() {
    const startTime = new Date();
    let status = 'success';
    let errorMessage = '';

    try {
      const result = fn.apply(this, arguments);
      return result;
    } catch (error) {
      status = 'error';
      errorMessage = error.message;
      throw error;
    } finally {
      logExecution({
        scriptId: ScriptApp.getScriptId(),
        scriptName: scriptName || 'Unknown',
        functionName: functionName,
        startTime: startTime,
        endTime: new Date(),
        status: status,
        errorMessage: errorMessage
      });
    }
  };
}
