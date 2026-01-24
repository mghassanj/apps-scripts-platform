// Google OAuth configuration for server-side API calls
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

interface GoogleCredentials {
  client_id: string
  client_secret: string
  access_token: string
  refresh_token: string
}

// Read credentials from clasp config or environment variables
function getCredentials(): GoogleCredentials {
  // First try environment variables (for production)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      access_token: process.env.GOOGLE_ACCESS_TOKEN || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    }
  }

  // Fall back to local clasp config (for development)
  const clasprcPath = path.join(process.env.HOME || '', '.clasprc.json')

  if (!fs.existsSync(clasprcPath)) {
    throw new Error(
      'Google credentials not found. Either set GOOGLE_CLIENT_ID and GOOGLE_REFRESH_TOKEN environment variables, ' +
      'or run "clasp login" locally.'
    )
  }

  const clasprc = JSON.parse(fs.readFileSync(clasprcPath, 'utf-8'))
  const token = clasprc.tokens?.default || clasprc.token

  if (!token) {
    throw new Error('No valid token found in .clasprc.json')
  }

  return {
    client_id: token.client_id,
    client_secret: token.client_secret,
    access_token: token.access_token,
    refresh_token: token.refresh_token
  }
}

// Create OAuth2 client with clasp credentials
export function getOAuth2Client() {
  const credentials = getCredentials()

  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret
  )

  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    token_type: 'Bearer'
  })

  return oauth2Client
}

// Get Google Drive API client
export function getDriveClient() {
  const auth = getOAuth2Client()
  return google.drive({ version: 'v3', auth })
}

// Get Google Apps Script API client
export function getScriptClient() {
  const auth = getOAuth2Client()
  return google.script({ version: 'v1', auth })
}

// Get Google Sheets API client
export function getSheetsClient() {
  const auth = getOAuth2Client()
  return google.sheets({ version: 'v4', auth })
}
