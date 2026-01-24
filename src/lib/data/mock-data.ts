import { Script, Execution, Backup, DashboardStats } from "@/types"

// Helper to create dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)

// Real scripts from Google Drive API
export const mockScripts: Script[] = [
  {
    id: "1GSN_Tvu_Tu97iPlb57YK6NwZyAnN9hXV0UofUyRUNSk",
    name: "Workable Integration",
    description: "Integrates with Workable ATS to sync candidate data and recruitment workflows",
    parentFile: {
      id: "1GSN_Tvu_Tu97iPlb57YK6NwZyAnN9hXV0UofUyRUNSk",
      name: "Workable integration",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1GSN_Tvu_Tu97iPlb57YK6NwZyAnN9hXV0UofUyRUNSk"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-workable",
        type: "time-driven",
        function: "syncWorkableData",
        schedule: "0 */2 * * *",
        lastFire: hoursAgo(1),
        nextFire: hoursFromNow(1),
        status: "enabled"
      }
    ],
    externalAPIs: ["Workable API"],
    sharedLibraries: ["JisrUtils"],
    connectedFiles: [],
    lastRun: hoursAgo(1),
    nextRun: hoursFromNow(1),
    avgExecutionTime: 15.2,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(120),
    updatedAt: hoursAgo(2)
  },
  {
    id: "1h0aRh78dCToXGMuF3utEyTDDAEy5oEtRphg-7JN8v7s",
    name: "Reject Correction Req for Attendance Violations",
    description: "Automatically rejects correction requests for attendance violations based on policy rules",
    parentFile: {
      id: "1h0aRh78dCToXGMuF3utEyTDDAEy5oEtRphg-7JN8v7s",
      name: "Reject Correction Req for Attendance Violations",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1h0aRh78dCToXGMuF3utEyTDDAEy5oEtRphg-7JN8v7s"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-reject-corr",
        type: "time-driven",
        function: "processRejections",
        schedule: "0 * * * *",
        lastFire: hoursAgo(0.5),
        nextFire: hoursFromNow(0.5),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "AttendanceHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(0.5),
    nextRun: hoursFromNow(0.5),
    avgExecutionTime: 8.7,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(1)
  },
  {
    id: "1geS-His8yFO8m81xQu74jqvAayDEYvflUhD_bkcXX80",
    name: "Master Works Letters Generator",
    description: "Generates HR letters and documents for Master Works company employees",
    parentFile: {
      id: "1geS-His8yFO8m81xQu74jqvAayDEYvflUhD_bkcXX80",
      name: "Master Works Letters Generator",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1geS-His8yFO8m81xQu74jqvAayDEYvflUhD_bkcXX80"
    },
    status: "healthy",
    type: "on-edit",
    triggers: [
      {
        id: "trigger-letters",
        type: "on-edit",
        function: "generateLetter",
        lastFire: hoursAgo(2),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Google Docs API", "Google Drive API"],
    sharedLibraries: ["JisrUtils", "LetterTemplates"],
    connectedFiles: [
      { id: "doc-templates", name: "Letter Templates", type: "document", url: "#", accessType: "read" }
    ],
    lastRun: hoursAgo(2),
    nextRun: null,
    avgExecutionTime: 12.3,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(180),
    updatedAt: hoursAgo(1)
  },
  {
    id: "1yzoUWY7rIT2yy0uYnDr3Aja_xLWRmudGDtdGYxHyNQk",
    name: "Resignation Validation Bayut",
    description: "Validates resignation requests for Bayut employees against company policies",
    parentFile: {
      id: "1yzoUWY7rIT2yy0uYnDr3Aja_xLWRmudGDtdGYxHyNQk",
      name: "Resignation validation Bayut",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1yzoUWY7rIT2yy0uYnDr3Aja_xLWRmudGDtdGYxHyNQk"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-resign-bayut",
        type: "time-driven",
        function: "validateResignations",
        schedule: "0 8 * * *",
        lastFire: hoursAgo(4),
        nextFire: hoursFromNow(20),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "ValidationLib"],
    connectedFiles: [],
    lastRun: hoursAgo(4),
    nextRun: hoursFromNow(20),
    avgExecutionTime: 22.5,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(3)
  },
  {
    id: "12YsK98Fj6SJ4P48NrQaefHjIdw3iUv_lQnrL6rN77bc",
    name: "Sales Onboarding Tracker",
    description: "Tracks and manages the sales team onboarding process and milestones",
    parentFile: {
      id: "12YsK98Fj6SJ4P48NrQaefHjIdw3iUv_lQnrL6rN77bc",
      name: "Sales onboarding tracker",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/12YsK98Fj6SJ4P48NrQaefHjIdw3iUv_lQnrL6rN77bc"
    },
    status: "healthy",
    type: "on-edit",
    triggers: [
      {
        id: "trigger-sales-onboard",
        type: "on-edit",
        function: "updateOnboardingStatus",
        lastFire: hoursAgo(1),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API"],
    sharedLibraries: ["JisrUtils", "OnboardingLib"],
    connectedFiles: [],
    lastRun: hoursAgo(1),
    nextRun: null,
    avgExecutionTime: 3.8,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(5)
  },
  {
    id: "195Au4h1Ki-ViU2aTWqh6b8mEtSxucgURiHPAYuIAo-s",
    name: "Requests Performance Mrsool",
    description: "Monitors and tracks request performance metrics for Mrsool client",
    parentFile: {
      id: "195Au4h1Ki-ViU2aTWqh6b8mEtSxucgURiHPAYuIAo-s",
      name: "Requests Performance mrsool",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/195Au4h1Ki-ViU2aTWqh6b8mEtSxucgURiHPAYuIAo-s"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-mrsool-perf",
        type: "time-driven",
        function: "calculatePerformance",
        schedule: "0 6 * * *",
        lastFire: hoursAgo(6),
        nextFire: hoursFromNow(18),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "PerformanceMetrics"],
    connectedFiles: [],
    lastRun: hoursAgo(6),
    nextRun: hoursFromNow(18),
    avgExecutionTime: 45.2,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(30),
    updatedAt: hoursAgo(6)
  },
  {
    id: "1XL-zp-Mxso5q_nBJN78GM8TyEyIkUTjwxqUY7dLd06U",
    name: "Al Waha Attendance Reminder",
    description: "Sends attendance reminders to Al Waha company employees",
    parentFile: {
      id: "1XL-zp-Mxso5q_nBJN78GM8TyEyIkUTjwxqUY7dLd06U",
      name: "Al Waha- Attendance Reminder",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1XL-zp-Mxso5q_nBJN78GM8TyEyIkUTjwxqUY7dLd06U"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-alwaha-att",
        type: "time-driven",
        function: "sendAttendanceReminder",
        schedule: "0 8,17 * * 1-5",
        lastFire: hoursAgo(2),
        nextFire: hoursFromNow(6),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API", "Slack API"],
    sharedLibraries: ["JisrUtils", "NotificationLib"],
    connectedFiles: [],
    lastRun: hoursAgo(2),
    nextRun: hoursFromNow(6),
    avgExecutionTime: 5.4,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(2)
  },
  {
    id: "1lmpBuhaQshKFnkBYZobmtXHJWaGW-Gheqr-F8fgtLMg",
    name: "Bostani Attendance",
    description: "Manages attendance tracking and reporting for Bostani company",
    parentFile: {
      id: "1lmpBuhaQshKFnkBYZobmtXHJWaGW-Gheqr-F8fgtLMg",
      name: "Bostani Attendance",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1lmpBuhaQshKFnkBYZobmtXHJWaGW-Gheqr-F8fgtLMg"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-bostani-att",
        type: "time-driven",
        function: "syncAttendance",
        schedule: "0 */4 * * *",
        lastFire: hoursAgo(2),
        nextFire: hoursFromNow(2),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "AttendanceHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(2),
    nextRun: hoursFromNow(2),
    avgExecutionTime: 18.9,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(120),
    updatedAt: hoursAgo(2)
  },
  {
    id: "1NSJRvuRC4Q_JDI8yTV8URQW3M2M1AFG2V_PVD6jFmhI",
    name: "Heritage Sites Attendance Reminder",
    description: "Sends attendance reminders to Heritage Sites company employees",
    parentFile: {
      id: "1NSJRvuRC4Q_JDI8yTV8URQW3M2M1AFG2V_PVD6jFmhI",
      name: "Heritage Sites - Attendance Reminder",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1NSJRvuRC4Q_JDI8yTV8URQW3M2M1AFG2V_PVD6jFmhI"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-heritage-att",
        type: "time-driven",
        function: "sendAttendanceReminder",
        schedule: "0 8,17 * * 1-5",
        lastFire: hoursAgo(3),
        nextFire: hoursFromNow(5),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API", "Slack API"],
    sharedLibraries: ["JisrUtils", "NotificationLib"],
    connectedFiles: [],
    lastRun: hoursAgo(3),
    nextRun: hoursFromNow(5),
    avgExecutionTime: 4.8,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(75),
    updatedAt: hoursAgo(3)
  },
  {
    id: "1s5J6PczuEPRbIc8xcYf2wFrGW87hOHUr1-6loJoqHGo",
    name: "Bayut Attendance Reminder",
    description: "Sends attendance reminders to Bayut company employees",
    parentFile: {
      id: "1s5J6PczuEPRbIc8xcYf2wFrGW87hOHUr1-6loJoqHGo",
      name: "Bayut Attendance Reminder",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1s5J6PczuEPRbIc8xcYf2wFrGW87hOHUr1-6loJoqHGo"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-bayut-att",
        type: "time-driven",
        function: "sendAttendanceReminder",
        schedule: "0 8,17 * * 1-5",
        lastFire: hoursAgo(4),
        nextFire: hoursFromNow(4),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API", "Slack API"],
    sharedLibraries: ["JisrUtils", "NotificationLib"],
    connectedFiles: [],
    lastRun: hoursAgo(4),
    nextRun: hoursFromNow(4),
    avgExecutionTime: 6.2,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(100),
    updatedAt: hoursAgo(4)
  },
  {
    id: "1ii-QqWim9ryW-8w2RmpGZbxhPf0hg5f50EVY-9jm2NU",
    name: "Bayut Probation Period",
    description: "Tracks and manages probation period milestones for Bayut employees",
    parentFile: {
      id: "1ii-QqWim9ryW-8w2RmpGZbxhPf0hg5f50EVY-9jm2NU",
      name: "Bayut Probation Period",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1ii-QqWim9ryW-8w2RmpGZbxhPf0hg5f50EVY-9jm2NU"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-bayut-prob",
        type: "time-driven",
        function: "checkProbationStatus",
        schedule: "0 9 * * *",
        lastFire: hoursAgo(8),
        nextFire: hoursFromNow(16),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "HRHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(8),
    nextRun: hoursFromNow(16),
    avgExecutionTime: 12.7,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(8)
  },
  {
    id: "1tPLc0lqSTX9IODKBNonzVhX6SW8HI6sKlOWn3no3vik",
    name: "Remote Leave Updated",
    description: "Syncs and updates remote leave requests across systems",
    parentFile: {
      id: "1tPLc0lqSTX9IODKBNonzVhX6SW8HI6sKlOWn3no3vik",
      name: "Remote Leave Updated",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1tPLc0lqSTX9IODKBNonzVhX6SW8HI6sKlOWn3no3vik"
    },
    status: "warning",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-remote-leave",
        type: "time-driven",
        function: "syncRemoteLeave",
        schedule: "0 */3 * * *",
        lastFire: hoursAgo(1),
        nextFire: hoursFromNow(2),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "LeaveLib"],
    connectedFiles: [],
    lastRun: hoursAgo(1),
    nextRun: hoursFromNow(2),
    avgExecutionTime: 35.4,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1)
  },
  {
    id: "17pomhgJ1uy1w7H5-Ru4rSxyHxVKCP-M2oJkw4nHXbmk",
    name: "Master Works Data Sheet",
    description: "Central data management for Master Works company HR operations",
    parentFile: {
      id: "17pomhgJ1uy1w7H5-Ru4rSxyHxVKCP-M2oJkw4nHXbmk",
      name: "Master Works Data Sheet",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/17pomhgJ1uy1w7H5-Ru4rSxyHxVKCP-M2oJkw4nHXbmk"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-mw-data",
        type: "time-driven",
        function: "refreshData",
        schedule: "0 6 * * *",
        lastFire: hoursAgo(10),
        nextFire: hoursFromNow(14),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "DataSyncLib"],
    connectedFiles: [
      { id: "11VssN0bmoev3g8Xrl2F05bWT-8jAtHpoUPFuhwco2aM", name: "Master Works DB Sync", type: "spreadsheet", url: "#", accessType: "read-write" }
    ],
    lastRun: hoursAgo(10),
    nextRun: hoursFromNow(14),
    avgExecutionTime: 28.9,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(1)
  },
  {
    id: "11VssN0bmoev3g8Xrl2F05bWT-8jAtHpoUPFuhwco2aM",
    name: "Master Works DB Sync",
    description: "Synchronizes Master Works data with external database systems",
    parentFile: {
      id: "11VssN0bmoev3g8Xrl2F05bWT-8jAtHpoUPFuhwco2aM",
      name: "Master Works DB Sync",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/11VssN0bmoev3g8Xrl2F05bWT-8jAtHpoUPFuhwco2aM"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-mw-sync",
        type: "time-driven",
        function: "syncDatabase",
        schedule: "0 */6 * * *",
        lastFire: hoursAgo(4),
        nextFire: hoursFromNow(2),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API", "PostgreSQL"],
    sharedLibraries: ["JisrUtils", "DatabaseLib"],
    connectedFiles: [],
    lastRun: hoursAgo(4),
    nextRun: hoursFromNow(2),
    avgExecutionTime: 55.3,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1)
  },
  {
    id: "1eQK17qumt9yfs3Co5T5lEB-XGDHHuX8bgQTRlY2n_hY",
    name: "Slack Product Feedback Channel Tracker",
    description: "Tracks and organizes product feedback from Slack channels",
    parentFile: {
      id: "1eQK17qumt9yfs3Co5T5lEB-XGDHHuX8bgQTRlY2n_hY",
      name: "Slack Product Feedback Channel Tracker",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1eQK17qumt9yfs3Co5T5lEB-XGDHHuX8bgQTRlY2n_hY"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-slack-feedback",
        type: "time-driven",
        function: "trackFeedback",
        schedule: "0 */2 * * *",
        lastFire: hoursAgo(1),
        nextFire: hoursFromNow(1),
        status: "enabled"
      }
    ],
    externalAPIs: ["Slack API"],
    sharedLibraries: ["JisrUtils", "SlackLib"],
    connectedFiles: [],
    lastRun: hoursAgo(1),
    nextRun: hoursFromNow(1),
    avgExecutionTime: 8.4,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1)
  },
  {
    id: "1Bw1WF1cVGl-d3bgQ40vNCOuQd8iDS-p4FgcJWzDEy90",
    name: "Last Login Status",
    description: "Monitors and reports on user login activity across the platform",
    parentFile: {
      id: "1Bw1WF1cVGl-d3bgQ40vNCOuQd8iDS-p4FgcJWzDEy90",
      name: "Last Login status",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1Bw1WF1cVGl-d3bgQ40vNCOuQd8iDS-p4FgcJWzDEy90"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-login-status",
        type: "time-driven",
        function: "checkLoginStatus",
        schedule: "0 8 * * *",
        lastFire: hoursAgo(12),
        nextFire: hoursFromNow(12),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "ReportingLib"],
    connectedFiles: [],
    lastRun: hoursAgo(12),
    nextRun: hoursFromNow(12),
    avgExecutionTime: 42.1,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1)
  },
  {
    id: "1uDNMtk_LmB5hzzaCIZev_pbMxpU-FoQlZU57eTv2lW8",
    name: "Government Relations Stats",
    description: "Generates statistics and reports for government relations activities",
    parentFile: {
      id: "1uDNMtk_LmB5hzzaCIZev_pbMxpU-FoQlZU57eTv2lW8",
      name: "Goverment Relation Stats",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1uDNMtk_LmB5hzzaCIZev_pbMxpU-FoQlZU57eTv2lW8"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-gov-stats",
        type: "time-driven",
        function: "generateStats",
        schedule: "0 7 * * 1",
        lastFire: daysAgo(2),
        nextFire: daysAgo(-5),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "ReportingLib"],
    connectedFiles: [],
    lastRun: daysAgo(2),
    nextRun: daysAgo(-5),
    avgExecutionTime: 65.8,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2)
  },
  {
    id: "1CqCU-sowKbfGx_9qxhvqF3wQC2KbHIGKMDVDyKoW65c",
    name: "Tam Dental Document Report",
    description: "Generates document reports for Tam Dental company",
    parentFile: {
      id: "1CqCU-sowKbfGx_9qxhvqF3wQC2KbHIGKMDVDyKoW65c",
      name: "Tam Dental Document Report",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1CqCU-sowKbfGx_9qxhvqF3wQC2KbHIGKMDVDyKoW65c"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-tam-dental",
        type: "time-driven",
        function: "generateDocumentReport",
        schedule: "0 9 * * *",
        lastFire: hoursAgo(14),
        nextFire: hoursFromNow(10),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API", "Google Drive API"],
    sharedLibraries: ["JisrUtils", "DocumentLib"],
    connectedFiles: [],
    lastRun: hoursAgo(14),
    nextRun: hoursFromNow(10),
    avgExecutionTime: 18.3,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1)
  },
  {
    id: "1_cUzQGo7OyKlg-TPLvYs0n1a2FzQcPdv-a-pFPrgWys",
    name: "Penalty Request",
    description: "Manages and processes employee penalty requests",
    parentFile: {
      id: "1_cUzQGo7OyKlg-TPLvYs0n1a2FzQcPdv-a-pFPrgWys",
      name: "penalty request",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1_cUzQGo7OyKlg-TPLvYs0n1a2FzQcPdv-a-pFPrgWys"
    },
    status: "healthy",
    type: "on-edit",
    triggers: [
      {
        id: "trigger-penalty",
        type: "on-edit",
        function: "processPenaltyRequest",
        lastFire: hoursAgo(0.5),
        nextFire: null,
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "HRHelpers"],
    connectedFiles: [],
    lastRun: hoursAgo(0.5),
    nextRun: null,
    avgExecutionTime: 4.2,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(30),
    updatedAt: hoursAgo(1)
  },
  {
    id: "1DadT4_9gHfBH-BGfZR0ghq3PufNGD1zhZosGAoz-51E",
    name: "Loan Validation (Master Works)",
    description: "Validates loan requests for Master Works employees",
    parentFile: {
      id: "1DadT4_9gHfBH-BGfZR0ghq3PufNGD1zhZosGAoz-51E",
      name: "Loan Validation ( Master Works )",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1DadT4_9gHfBH-BGfZR0ghq3PufNGD1zhZosGAoz-51E"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-loan-mw",
        type: "time-driven",
        function: "validateLoans",
        schedule: "0 10 * * *",
        lastFire: hoursAgo(2),
        nextFire: hoursFromNow(22),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "FinanceLib"],
    connectedFiles: [],
    lastRun: hoursAgo(2),
    nextRun: hoursFromNow(22),
    avgExecutionTime: 15.6,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(2)
  },
  {
    id: "1vfZaa0b6RkMwcEqmVUqDWblcfAae17twrA2-ggH32tc",
    name: "Requests Performance Salla",
    description: "Monitors and tracks request performance metrics for Salla client",
    parentFile: {
      id: "1vfZaa0b6RkMwcEqmVUqDWblcfAae17twrA2-ggH32tc",
      name: "Requests Performance Salla",
      type: "spreadsheet",
      url: "https://docs.google.com/spreadsheets/d/1vfZaa0b6RkMwcEqmVUqDWblcfAae17twrA2-ggH32tc"
    },
    status: "healthy",
    type: "time-driven",
    triggers: [
      {
        id: "trigger-salla-perf",
        type: "time-driven",
        function: "calculatePerformance",
        schedule: "0 7 * * *",
        lastFire: hoursAgo(5),
        nextFire: hoursFromNow(19),
        status: "enabled"
      }
    ],
    externalAPIs: ["Jisr API"],
    sharedLibraries: ["JisrUtils", "PerformanceMetrics"],
    connectedFiles: [],
    lastRun: hoursAgo(5),
    nextRun: hoursFromNow(19),
    avgExecutionTime: 38.7,
    owner: "m.ghassan@jisr.net",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(1)
  }
]

export const mockExecutions: Execution[] = [
  {
    id: "exec-1",
    scriptId: "1h0aRh78dCToXGMuF3utEyTDDAEy5oEtRphg-7JN8v7s",
    scriptName: "Reject Correction Req for Attendance Violations",
    function: "processRejections",
    startTime: hoursAgo(0.5),
    endTime: hoursAgo(0.49),
    duration: 8.7,
    status: "success"
  },
  {
    id: "exec-2",
    scriptId: "1tPLc0lqSTX9IODKBNonzVhX6SW8HI6sKlOWn3no3vik",
    scriptName: "Remote Leave Updated",
    function: "syncRemoteLeave",
    startTime: hoursAgo(1),
    endTime: hoursAgo(0.99),
    duration: 35.4,
    status: "warning",
    message: "Some records could not be synced - retrying on next run"
  },
  {
    id: "exec-3",
    scriptId: "1GSN_Tvu_Tu97iPlb57YK6NwZyAnN9hXV0UofUyRUNSk",
    scriptName: "Workable Integration",
    function: "syncWorkableData",
    startTime: hoursAgo(1),
    endTime: hoursAgo(0.99),
    duration: 15.2,
    status: "success"
  },
  {
    id: "exec-4",
    scriptId: "12YsK98Fj6SJ4P48NrQaefHjIdw3iUv_lQnrL6rN77bc",
    scriptName: "Sales Onboarding Tracker",
    function: "updateOnboardingStatus",
    startTime: hoursAgo(1),
    endTime: hoursAgo(0.99),
    duration: 3.8,
    status: "success"
  },
  {
    id: "exec-5",
    scriptId: "1eQK17qumt9yfs3Co5T5lEB-XGDHHuX8bgQTRlY2n_hY",
    scriptName: "Slack Product Feedback Channel Tracker",
    function: "trackFeedback",
    startTime: hoursAgo(1),
    endTime: hoursAgo(0.99),
    duration: 8.4,
    status: "success"
  },
  {
    id: "exec-6",
    scriptId: "1XL-zp-Mxso5q_nBJN78GM8TyEyIkUTjwxqUY7dLd06U",
    scriptName: "Al Waha Attendance Reminder",
    function: "sendAttendanceReminder",
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.99),
    duration: 5.4,
    status: "success"
  },
  {
    id: "exec-7",
    scriptId: "1geS-His8yFO8m81xQu74jqvAayDEYvflUhD_bkcXX80",
    scriptName: "Master Works Letters Generator",
    function: "generateLetter",
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.99),
    duration: 12.3,
    status: "success"
  },
  {
    id: "exec-8",
    scriptId: "1lmpBuhaQshKFnkBYZobmtXHJWaGW-Gheqr-F8fgtLMg",
    scriptName: "Bostani Attendance",
    function: "syncAttendance",
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.99),
    duration: 18.9,
    status: "success"
  },
  {
    id: "exec-9",
    scriptId: "1_cUzQGo7OyKlg-TPLvYs0n1a2FzQcPdv-a-pFPrgWys",
    scriptName: "Penalty Request",
    function: "processPenaltyRequest",
    startTime: hoursAgo(0.5),
    endTime: hoursAgo(0.49),
    duration: 4.2,
    status: "success"
  },
  {
    id: "exec-10",
    scriptId: "1DadT4_9gHfBH-BGfZR0ghq3PufNGD1zhZosGAoz-51E",
    scriptName: "Loan Validation (Master Works)",
    function: "validateLoans",
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.99),
    duration: 15.6,
    status: "success"
  }
]

export const mockBackups: Backup[] = [
  {
    id: "backup-1",
    date: daysAgo(0),
    scriptsCount: 21,
    size: 15728640, // 15 MB
    status: "complete",
    path: "/backups/2026-01-24"
  },
  {
    id: "backup-2",
    date: daysAgo(1),
    scriptsCount: 21,
    size: 15335424, // 14.6 MB
    status: "complete",
    path: "/backups/2026-01-23"
  },
  {
    id: "backup-3",
    date: daysAgo(2),
    scriptsCount: 21,
    size: 14942208, // 14.2 MB
    status: "complete",
    path: "/backups/2026-01-22"
  },
  {
    id: "backup-4",
    date: daysAgo(3),
    scriptsCount: 20,
    size: 14548992, // 13.9 MB
    status: "complete",
    path: "/backups/2026-01-21"
  },
  {
    id: "backup-5",
    date: daysAgo(4),
    scriptsCount: 20,
    size: 14155776, // 13.5 MB
    status: "partial",
    path: "/backups/2026-01-20"
  }
]

export const mockDashboardStats: DashboardStats = {
  totalScripts: 21,
  healthyCount: 20,
  warningCount: 1,
  errorCount: 0,
  executionsToday: 156,
  successRate: 99.4,
  avgExecutionTime: 18.7
}

// Chart data for execution trends
export const executionTrendData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  executions: Math.floor(Math.random() * 15) + 5,
  errors: Math.floor(Math.random() * 2)
}))

// Chart data for performance over time
export const performanceData = [
  { date: "Jan 18", avgTime: 17.2, executions: 142 },
  { date: "Jan 19", avgTime: 18.1, executions: 138 },
  { date: "Jan 20", avgTime: 16.8, executions: 155 },
  { date: "Jan 21", avgTime: 19.5, executions: 148 },
  { date: "Jan 22", avgTime: 18.0, executions: 151 },
  { date: "Jan 23", avgTime: 17.9, executions: 159 },
  { date: "Jan 24", avgTime: 18.7, executions: 156 }
]
