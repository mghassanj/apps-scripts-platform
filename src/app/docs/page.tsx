"use client"

import { Search, BookOpen, FileCode, Code2, Wrench, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { mockScripts } from "@/lib/data/mock-data"

const guides = [
  {
    title: "Getting Started",
    description: "Learn how to set up and use the Apps Scripts Manager",
    icon: BookOpen,
    href: "#getting-started"
  },
  {
    title: "Working with clasp",
    description: "Pull, push, and sync your scripts with Google",
    icon: Code2,
    href: "#clasp"
  },
  {
    title: "Setting Up Triggers",
    description: "Configure automated script execution",
    icon: Wrench,
    href: "#triggers"
  },
  {
    title: "Troubleshooting",
    description: "Common issues and how to resolve them",
    icon: AlertCircle,
    href: "#troubleshooting"
  }
]

export default function DocsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Central documentation for all your scripts and workflows
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {guides.map((guide) => (
          <Card key={guide.title} className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <guide.icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{guide.title}</CardTitle>
              </div>
              <CardDescription>{guide.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Script Documentation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Script Documentation</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockScripts.slice(0, 9).map((script) => (
            <Link
              key={script.id}
              href={`/scripts/${script.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{script.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {script.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {script.externalAPIs.slice(0, 2).map((api) => (
                      <Badge key={api} variant="secondary" className="text-xs">
                        {api}
                      </Badge>
                    ))}
                    {script.externalAPIs.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{script.externalAPIs.length - 2}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Separator />

      {/* Getting Started Guide */}
      <Card id="getting-started">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Quick guide to using the Apps Scripts Manager</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <h3>Prerequisites</h3>
          <ul>
            <li>Node.js v18 or higher</li>
            <li>Google account with Apps Script API enabled</li>
            <li>clasp CLI installed globally</li>
          </ul>

          <h3>Initial Setup</h3>
          <ol>
            <li>Install clasp: <code>npm install -g @google/clasp</code></li>
            <li>Login to Google: <code>clasp login</code></li>
            <li>Enable Apps Script API at script.google.com/home/usersettings</li>
          </ol>

          <h3>Common Commands</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
{`# List all scripts
clasp list

# Clone a script
clasp clone <scriptId>

# Pull latest changes
clasp pull

# Push local changes
clasp push

# View execution logs
clasp logs`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
