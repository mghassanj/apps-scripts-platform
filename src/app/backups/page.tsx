"use client"

import { Archive, Download, RotateCcw, Plus, Calendar, HardDrive, FileCode, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { mockBackups } from "@/lib/data/mock-data"
import { format, formatDistanceToNow } from "date-fns"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function BackupsPage() {
  const backups = mockBackups
  const totalBackups = backups.length
  const lastBackup = backups[0]
  const totalSize = backups.reduce((acc, b) => acc + b.size, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground">
            Manage backups and restore previous versions of your scripts
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Backup Now
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackups}</div>
            <p className="text-xs text-muted-foreground">
              Stored locally
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDistanceToNow(lastBackup.date, { addSuffix: true })}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(lastBackup.date, "MMM d, yyyy HH:mm")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
            <p className="text-xs text-muted-foreground">
              Across all backups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>All available backups for restoration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Scripts</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Path</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{format(backup.date, "MMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(backup.date, { addSuffix: true })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      {backup.scriptsCount}
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(backup.size)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={backup.status === "complete" ? "default" : backup.status === "partial" ? "secondary" : "destructive"}
                    >
                      {backup.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{backup.path}</code>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Restore Backup</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to restore from this backup? This will overwrite the current local copies of all scripts.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="rounded-lg border p-4 space-y-2">
                              <p><strong>Date:</strong> {format(backup.date, "MMM d, yyyy HH:mm")}</p>
                              <p><strong>Scripts:</strong> {backup.scriptsCount}</p>
                              <p><strong>Size:</strong> {formatBytes(backup.size)}</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button>Confirm Restore</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Retention Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policy</CardTitle>
          <CardDescription>Configure how long backups are kept</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Daily Backups</p>
                <p className="text-sm text-muted-foreground">Keep daily backups for 7 days</p>
              </div>
              <Badge variant="outline">7 days</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Weekly Backups</p>
                <p className="text-sm text-muted-foreground">Keep weekly backups for 4 weeks</p>
              </div>
              <Badge variant="outline">4 weeks</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Monthly Backups</p>
                <p className="text-sm text-muted-foreground">Keep monthly backups for 12 months</p>
              </div>
              <Badge variant="outline">12 months</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automated Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Backups</CardTitle>
          <CardDescription>Schedule automatic backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Daily Backup</p>
              <p className="text-sm text-muted-foreground">
                Automatically backup all scripts every day at 2:00 AM
              </p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
