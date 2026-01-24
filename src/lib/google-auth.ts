// Google OAuth configuration for server-side API calls
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

// Read credentials from clasp config
function getCredentials() {
  const clasprcPath = path.join(process.env.HOME || '', '.clasprc.json')

  if (!fs.existsSync(clasprcPath)) {
    throw new Error('clasp credentials not found. Please run "clasp login" first.')
  }

  const clasprc = JSON.parse(fs.readFileSync(clasprcPath, 'utf-8'))
  return clasprc.tokens?.default || clasprc.token
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
