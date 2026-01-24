-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentFileId" TEXT,
    "parentFileName" TEXT,
    "parentFileType" TEXT,
    "owner" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME,
    "lastAnalyzedAt" DATETIME,
    "functionalSummary" TEXT,
    "workflowSteps" TEXT,
    "complexity" TEXT,
    "linesOfCode" INTEGER
);

-- CreateTable
CREATE TABLE "ScriptFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScriptFile_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalApi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "codeLocation" TEXT,
    CONSTRAINT "ExternalApi_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "schedule" TEXT,
    "scheduleDescription" TEXT,
    "sourceEvent" TEXT,
    "isProgrammatic" BOOLEAN NOT NULL DEFAULT false,
    "lastFiredAt" DATETIME,
    "nextFireAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    CONSTRAINT "Trigger_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConnectedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "accessType" TEXT NOT NULL,
    "extractedFrom" TEXT NOT NULL,
    "codeLocation" TEXT,
    CONSTRAINT "ConnectedFile_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "duration" REAL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Execution_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScriptFunction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "lineCount" INTEGER,
    "fileName" TEXT,
    CONSTRAINT "ScriptFunction_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoogleService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    CONSTRAINT "GoogleService_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFile_scriptId_name_key" ON "ScriptFile"("scriptId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApi_scriptId_url_method_key" ON "ExternalApi"("scriptId", "url", "method");

-- CreateIndex
CREATE UNIQUE INDEX "Trigger_scriptId_functionName_type_key" ON "Trigger"("scriptId", "functionName", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedFile_scriptId_fileId_key" ON "ConnectedFile"("scriptId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFunction_scriptId_name_key" ON "ScriptFunction"("scriptId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleService_scriptId_serviceName_key" ON "GoogleService"("scriptId", "serviceName");
