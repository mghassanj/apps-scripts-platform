#!/usr/bin/env node
/**
 * Script to authenticate with Google OAuth including script.processes scope
 * Run with: node auth-with-scope.js
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const open = require('open');

// Read the creds.json file
const credsPath = path.join(__dirname, 'creds.json');
if (!fs.existsSync(credsPath)) {
  console.error('Error: creds.json not found. Please download OAuth credentials from Google Cloud Console.');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
const clientId = creds.installed?.client_id || creds.web?.client_id;
const clientSecret = creds.installed?.client_secret || creds.web?.client_secret;

if (!clientId || !clientSecret) {
  console.error('Error: Invalid creds.json format');
  process.exit(1);
}

// All required scopes including script.processes and script.metrics
const SCOPES = [
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.webapp.deploy',
  'https://www.googleapis.com/auth/script.processes',  // For execution logs!
  'https://www.googleapis.com/auth/script.metrics',    // For script metrics!
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/service.management',
  'https://www.googleapis.com/auth/logging.read',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cloud-platform'
];

const PORT = 3333;

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  `http://localhost:${PORT}`
);

// Create a local server to receive the OAuth callback
const server = http.createServer(async (req, res) => {
  const queryParams = url.parse(req.url, true).query;

  if (queryParams.code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>');

    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(queryParams.code);

      console.log('\n✅ Authentication successful!\n');

      // Update .clasprc.json with new tokens
      const clasprcPath = path.join(process.env.HOME, '.clasprc.json');
      let clasprc = {};

      if (fs.existsSync(clasprcPath)) {
        clasprc = JSON.parse(fs.readFileSync(clasprcPath, 'utf-8'));
      }

      clasprc.tokens = clasprc.tokens || {};
      clasprc.tokens.default = {
        client_id: clientId,
        client_secret: clientSecret,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expiry_date: tokens.expiry_date,
        type: 'authorized_user'
      };

      fs.writeFileSync(clasprcPath, JSON.stringify(clasprc, null, 2));
      console.log('✅ Updated ~/.clasprc.json with new tokens (including script.processes scope)');
      console.log('\nYou can now sync execution logs!');

    } catch (error) {
      console.error('Error exchanging code for tokens:', error.message);
    }

    server.close();
    process.exit(0);
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing authorization code');
  }
});

server.listen(PORT, async () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'  // Force consent to get refresh token
  });

  console.log('🔐 Opening browser for Google authentication...');
  console.log('   (includes script.processes scope for execution logs)\n');
  console.log('If the browser doesn\'t open, visit this URL:\n');
  console.log(authUrl);
  console.log('\nWaiting for authentication...');

  // Try to open browser
  try {
    await open(authUrl);
  } catch (e) {
    console.log('Could not open browser automatically. Please visit the URL above.');
  }
});
