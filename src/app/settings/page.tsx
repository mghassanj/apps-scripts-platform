"use client"

import { useState } from "react"
import { Bell, Mail, Shield, Database, User, Key, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [alertOnError, setAlertOnError] = useState(true)
  const [alertOnWarning, setAlertOnWarning] = useState(true)
  const [dailySummary, setDailySummary] = useState(true)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Apps Scripts management platform
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="mr-2 h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & Auth
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="mr-2 h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when and how you receive email alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts">Enable Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="your@email.com"
                  defaultValue="user@company.com"
                  disabled={!emailAlerts}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alert Types</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="alert-error">Alert on Error</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive immediate alerts when scripts fail
                    </p>
                  </div>
                  <Switch
                    id="alert-error"
                    checked={alertOnError}
                    onCheckedChange={setAlertOnError}
                    disabled={!emailAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="alert-warning">Alert on Warning</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for warnings and slow executions
                    </p>
                  </div>
                  <Switch
                    id="alert-warning"
                    checked={alertOnWarning}
                    onCheckedChange={setAlertOnWarning}
                    disabled={!emailAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-summary">Daily Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily digest of all script activity
                    </p>
                  </div>
                  <Switch
                    id="daily-summary"
                    checked={dailySummary}
                    onCheckedChange={setDailySummary}
                    disabled={!emailAlerts}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="summary-time">Summary Time</Label>
                <Select defaultValue="09:00" disabled={!emailAlerts || !dailySummary}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
              <CardDescription>
                Configure automated backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="backup-path">Backup Directory</Label>
                <Input
                  id="backup-path"
                  defaultValue="~/apps-scripts/backups"
                  placeholder="/path/to/backups"
                />
                <p className="text-sm text-muted-foreground">
                  Local directory where backups are stored
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automated Daily Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup all scripts every day
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-time">Backup Time</Label>
                <Select defaultValue="02:00">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00:00">12:00 AM</SelectItem>
                    <SelectItem value="02:00">2:00 AM</SelectItem>
                    <SelectItem value="04:00">4:00 AM</SelectItem>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Retention Policy</h4>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="daily-retention">Daily (days)</Label>
                    <Input
                      id="daily-retention"
                      type="number"
                      defaultValue="7"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly-retention">Weekly (weeks)</Label>
                    <Input
                      id="weekly-retention"
                      type="number"
                      defaultValue="4"
                      min="1"
                      max="12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-retention">Monthly (months)</Label>
                    <Input
                      id="monthly-retention"
                      type="number"
                      defaultValue="12"
                      min="1"
                      max="24"
                    />
                  </div>
                </div>
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & Auth Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Authentication</CardTitle>
              <CardDescription>
                Manage your Google Apps Script API connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Connected to Google</p>
                    <p className="text-sm text-muted-foreground">
                      Authenticated via clasp CLI
                    </p>
                  </div>
                </div>
                <Button variant="outline">Reconnect</Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Credentials Location</Label>
                <code className="block rounded-lg bg-muted p-3 text-sm">
                  ~/.clasprc.json
                </code>
                <p className="text-sm text-muted-foreground">
                  Your Google OAuth credentials are stored securely here
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Apps Script API</Label>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Enabled</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Apps Script API is enabled in your Google account
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>External Integrations</CardTitle>
              <CardDescription>
                API keys for external services used by your scripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Slack</p>
                    <p className="text-sm text-muted-foreground">
                      Used by 3 scripts
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SendGrid</p>
                    <p className="text-sm text-muted-foreground">
                      Used by 2 scripts
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Salesforce</p>
                    <p className="text-sm text-muted-foreground">
                      Used by 1 script
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  defaultValue="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  defaultValue="john@company.com"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="america-los_angeles">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america-los_angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="america-denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="america-chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="america-new_york">Eastern Time (ET)</SelectItem>
                    <SelectItem value="europe-london">London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
