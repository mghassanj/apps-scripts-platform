# Google Apps Script Management Platform - UI Component Plan

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS
- **Charts**: Recharts (via shadcn/ui Chart component)
- **Tables**: TanStack Table (via shadcn/ui DataTable)
- **Icons**: Lucide React
- **State Management**: React Query + Zustand

---

## Application Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header/Navbar                           │
│  [Logo] [Dashboard] [Scripts] [Docs] [Settings]    [Search] [?] │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sidebar   │                  Main Content Area                 │
│            │                                                    │
│  - Overview│                                                    │
│  - Scripts │                                                    │
│  - Monitor │                                                    │
│  - Backups │                                                    │
│  - Docs    │                                                    │
│  - Settings│                                                    │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

---

## Page Structure & Components

### 1. Dashboard Overview Page (`/dashboard`)

**Purpose**: Quick health overview of all scripts

**Components Used**:
- `Card` - Stat cards for overview metrics
- `Chart` (BarChart, LineChart) - Execution trends
- `Badge` - Status indicators
- `Table` - Recent activity summary
- `Alert` - Critical issues banner

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard Overview                              [Refresh] [↻] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Total   │ │ Healthy │ │ Warning │ │ Errors  │            │
│ │ Scripts │ │   ✓     │ │   ⚠     │ │   ✗     │            │
│ │   15    │ │   12    │ │    2    │ │    1    │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │              Execution Trends (24h)                     │  │
│ │  ████                                                   │  │
│ │  ████ ██                                                │  │
│ │  ████ ██ ████                                           │  │
│ │  ----+----+----+----+----+----+----+----+----+----     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌──────────────────────────┐ ┌───────────────────────────┐  │
│ │   Recent Errors          │ │   Recent Activity         │  │
│ │   ─────────────────────  │ │   ────────────────────    │  │
│ │   • Script A - Error...  │ │   • Script B ran at 2pm   │  │
│ │   • Script C - Failed... │ │   • Script A ran at 1pm   │  │
│ └──────────────────────────┘ └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**shadcn/ui Components**:
```tsx
// Stat Cards
<Card>
  <CardHeader>
    <CardTitle>Total Scripts</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold">15</div>
  </CardContent>
</Card>

// Status Badge
<Badge variant="default">Healthy</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>

// Charts using Recharts
<ChartContainer config={chartConfig}>
  <BarChart data={executionData}>
    <CartesianGrid />
    <XAxis dataKey="time" />
    <Bar dataKey="executions" />
  </BarChart>
</ChartContainer>
```

---

### 2. Scripts Inventory Page (`/scripts`)

**Purpose**: List and manage all Apps Scripts

**Components Used**:
- `DataTable` - Full-featured script list with sorting/filtering
- `Badge` - Status indicators
- `DropdownMenu` - Row actions
- `Dialog` - Script details modal
- `Tabs` - Filter tabs (All, Active, Inactive)
- `Command` - Search/filter palette

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Scripts Inventory                    [+ Add Script] [Search] │
├──────────────────────────────────────────────────────────────┤
│ [All (15)] [Active (12)] [Inactive (2)] [Error (1)]          │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ □ │ Name          │ Status  │ Last Run    │ Type    │ ⋮ │ │
│ ├───┼───────────────┼─────────┼─────────────┼─────────┼───┤ │
│ │ □ │ Daily Report  │ ✓ OK    │ 2h ago      │ Trigger │ ⋮ │ │
│ │ □ │ Slack Sync    │ ⚠ Warn  │ 4h ago      │ Trigger │ ⋮ │ │
│ │ □ │ Data Import   │ ✗ Error │ Yesterday   │ Manual  │ ⋮ │ │
│ │ □ │ Email Sender  │ ✓ OK    │ 1h ago      │ Trigger │ ⋮ │ │
│ └──────────────────────────────────────────────────────────┘ │
│                              [< 1 2 3 ... 10 >]              │
└──────────────────────────────────────────────────────────────┘
```

**DataTable Column Definitions**:
```tsx
const columns: ColumnDef<Script>[] = [
  {
    id: "select",
    header: ({ table }) => <Checkbox ... />,
    cell: ({ row }) => <Checkbox ... />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FileCode className="h-4 w-4" />
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
        <Badge variant={getStatusVariant(status)}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "lastRun",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Run" />,
    cell: ({ row }) => <RelativeTime date={row.getValue("lastRun")} />,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("type")}</Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Open in Editor</DropdownMenuItem>
          <DropdownMenuItem>View Logs</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Pull Changes</DropdownMenuItem>
          <DropdownMenuItem>Push Changes</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600">
            Disable Script
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
```

---

### 3. Script Detail Page (`/scripts/[id]`)

**Purpose**: Deep dive into a single script

**Components Used**:
- `Tabs` - Code, Logs, Triggers, Dependencies, Settings
- `Card` - Info panels
- `Table` - Execution history
- `Chart` - Performance metrics
- `Badge` - Status/tags
- `Button` - Actions (Pull, Push, Run)
- `CodeBlock` - View script code

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ ← Back   Daily Report Script                                 │
│          Sheet: Sales Dashboard                              │
├──────────────────────────────────────────────────────────────┤
│ [Overview] [Code] [Logs] [Triggers] [Dependencies] [History] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Status              │ │ Quick Actions                   │ │
│ │ ────────────────    │ │ ──────────────────              │ │
│ │ ✓ Healthy           │ │ [▶ Run Now] [↓ Pull] [↑ Push]   │ │
│ │ Last run: 2h ago    │ │ [📝 Edit] [⚙ Settings]          │ │
│ │ Next run: in 1h     │ └─────────────────────────────────┘ │
│ │ Avg time: 12s       │                                     │
│ └─────────────────────┘                                     │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Recent Executions                                       │  │
│ │ ──────────────────────────────────────────────────────  │  │
│ │ Time          │ Status │ Duration │ Message             │  │
│ │ 2h ago        │ ✓ OK   │ 12s      │ Completed           │  │
│ │ 3h ago        │ ✓ OK   │ 11s      │ Completed           │  │
│ │ 4h ago        │ ⚠ Warn │ 45s      │ Slow execution      │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 4. Monitoring Dashboard Page (`/monitoring`)

**Purpose**: Real-time health monitoring

**Components Used**:
- `Card` - Metric cards
- `Chart` - Multiple chart types (Line, Bar, Area)
- `Table` - Error log table
- `Badge` - Status indicators
- `Alert` - Critical alerts banner
- `Tabs` - Overview, Errors, Performance, Alerts

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Monitoring Dashboard                 [Last updated: 2m ago]  │
├──────────────────────────────────────────────────────────────┤
│ [Overview] [Errors] [Performance] [Alerts]                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ⚠ ALERT: 3 scripts have errors in the last hour         ││
│ │ [View Details] [Dismiss]                                 ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │Executions│ │ Success  │ │ Failures │ │ Avg Time │        │
│ │  Today   │ │   Rate   │ │  Today   │ │          │        │
│ │   847    │ │   98.2%  │ │    15    │ │   8.3s   │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                 Execution Timeline                       │ │
│ │                                                          │ │
│ │  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄   │ │
│ │  12am    4am     8am     12pm    4pm     8pm    12am    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Recent Errors                                   [View All]│
│ ├──────────┬──────────────┬───────────────────────────────┤ │
│ │ Time     │ Script       │ Error Message                 │ │
│ ├──────────┼──────────────┼───────────────────────────────┤ │
│ │ 5m ago   │ Data Import  │ TypeError: Cannot read prop...│ │
│ │ 1h ago   │ Slack Sync   │ Service unavailable           │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

### 5. Documentation Hub Page (`/docs`)

**Purpose**: Central documentation for all scripts

**Components Used**:
- `Sidebar` - Navigation tree
- `Card` - Doc cards
- `Tabs` - Content sections
- `Table` - Function reference tables
- `CodeBlock` - Code examples
- `Command` - Search docs

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Documentation Hub                              [🔍 Search]    │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│ ▼ Scripts  │  # Daily Report Script                         │
│   • Daily  │                                                 │
│   • Slack  │  ## Overview                                    │
│   • Import │  This script generates daily sales reports...  │
│            │                                                 │
│ ▼ Guides   │  ## Triggers                                    │
│   • Setup  │  - Time-driven: Every day at 6 AM              │
│   • Deploy │                                                 │
│   • Debug  │  ## Functions                                   │
│            │  | Function | Description |                     │
│ ▼ API Ref  │  |----------|-------------|                     │
│   • Sheets │  | main()   | Entry point |                     │
│   • Slack  │  | getData()| Fetch data  |                     │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

---

### 6. Backups Page (`/backups`)

**Purpose**: Manage backups and recovery

**Components Used**:
- `DataTable` - Backup history
- `Card` - Backup stats
- `Button` - Create backup, Restore
- `Dialog` - Restore confirmation
- `Calendar` - Date picker for backups
- `Badge` - Backup status

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Backups & Recovery                    [+ Create Backup Now]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│ │ Total    │ │ Last     │ │ Storage  │                      │
│ │ Backups  │ │ Backup   │ │ Used     │                      │
│ │   124    │ │ 2h ago   │ │ 2.4 GB   │                      │
│ └──────────┘ └──────────┘ └──────────┘                      │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Date       │ Scripts │ Size   │ Status    │ Actions      ││
│ ├────────────┼─────────┼────────┼───────────┼──────────────┤│
│ │ 2024-01-23 │ 15      │ 12 MB  │ ✓ Complete│ [Restore] [↓]││
│ │ 2024-01-22 │ 15      │ 12 MB  │ ✓ Complete│ [Restore] [↓]││
│ │ 2024-01-21 │ 14      │ 11 MB  │ ✓ Complete│ [Restore] [↓]││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Retention Policy: 7 days daily, 4 weeks weekly, 12 months   │
└──────────────────────────────────────────────────────────────┘
```

---

### 7. Dependency Map Page (`/dependencies`)

**Purpose**: Visualize script relationships

**Components Used**:
- Interactive graph (React Flow or similar)
- `Card` - Legend and stats
- `Select` - Filter by script/type
- `Badge` - Node labels
- `Tooltip` - Node details

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Dependency Map                     [Filter: All] [Zoom: 100%]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌─────────┐         ┌─────────┐                          │
│    │ Script  │────────>│ Slack   │                          │
│    │ A       │         │ API     │                          │
│    └────┬────┘         └─────────┘                          │
│         │                                                    │
│         ▼                                                    │
│    ┌─────────┐         ┌─────────┐                          │
│    │ Shared  │<────────│ Script  │                          │
│    │ Library │         │ B       │                          │
│    └────┬────┘         └────┬────┘                          │
│         │                   │                                │
│         ▼                   ▼                                │
│    ┌─────────┐         ┌─────────┐                          │
│    │ Sales   │         │ Config  │                          │
│    │ Sheet   │         │ Sheet   │                          │
│    └─────────┘         └─────────┘                          │
│                                                              │
│ Legend: [Script] [API] [Sheet/Doc] [Library]                │
└──────────────────────────────────────────────────────────────┘
```

---

### 8. Settings Page (`/settings`)

**Purpose**: Configure platform settings

**Components Used**:
- `Tabs` - Settings categories
- `Card` - Setting sections
- `Input`, `Select`, `Switch` - Form controls
- `Button` - Save actions
- `Alert` - Warning messages

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Settings                                                     │
├──────────────────────────────────────────────────────────────┤
│ [General] [Notifications] [Backup] [API] [Team]              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Notification Settings                                     ││
│ │ ──────────────────────────────────────────────────────── ││
│ │                                                           ││
│ │ Email Alerts                           [✓ Enabled]        ││
│ │ Email Address                          [user@example.com] ││
│ │                                                           ││
│ │ Alert on Error                         [✓]                ││
│ │ Alert on Warning                       [✓]                ││
│ │ Daily Summary                          [✓]                ││
│ │ Summary Time                           [09:00 AM    ▼]    ││
│ │                                                           ││
│ │                                              [Save Changes]││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## Shared/Global Components

### Navigation Sidebar
```tsx
// components/app-sidebar.tsx
const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Scripts", url: "/scripts", icon: FileCode },
  { title: "Monitoring", url: "/monitoring", icon: Activity },
  { title: "Documentation", url: "/docs", icon: BookOpen },
  { title: "Backups", url: "/backups", icon: Archive },
  { title: "Dependencies", url: "/dependencies", icon: Network },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Command Palette (⌘K)
```tsx
// components/command-menu.tsx
export function CommandMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search scripts, docs, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Scripts">
          {scripts.map((script) => (
            <CommandItem key={script.id}>
              <FileCode className="mr-2 h-4 w-4" />
              <span>{script.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>
            <Play className="mr-2 h-4 w-4" />
            <span>Run Script</span>
          </CommandItem>
          <CommandItem>
            <Download className="mr-2 h-4 w-4" />
            <span>Pull All Scripts</span>
          </CommandItem>
          <CommandItem>
            <Upload className="mr-2 h-4 w-4" />
            <span>Create Backup</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

### Status Badge Component
```tsx
// components/status-badge.tsx
type Status = "healthy" | "warning" | "error" | "inactive"

const statusConfig: Record<Status, { label: string; variant: string; icon: LucideIcon }> = {
  healthy: { label: "Healthy", variant: "default", icon: CheckCircle },
  warning: { label: "Warning", variant: "warning", icon: AlertTriangle },
  error: { label: "Error", variant: "destructive", icon: XCircle },
  inactive: { label: "Inactive", variant: "secondary", icon: Minus },
}

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}
```

---

## Component Installation Commands

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Install core components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add command
npx shadcn@latest add sidebar
npx shadcn@latest add chart
npx shadcn@latest add alert
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add switch
npx shadcn@latest add checkbox
npx shadcn@latest add calendar
npx shadcn@latest add tooltip
npx shadcn@latest add separator
npx shadcn@latest add skeleton

# Additional packages
npm install @tanstack/react-table
npm install @tanstack/react-query
npm install recharts
npm install lucide-react
npm install zustand
npm install date-fns
```

---

## File Structure

```
apps-scripts-platform/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Redirect to /dashboard
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard overview
│   ├── scripts/
│   │   ├── page.tsx            # Scripts inventory
│   │   └── [id]/
│   │       └── page.tsx        # Script detail
│   ├── monitoring/
│   │   └── page.tsx            # Monitoring dashboard
│   ├── docs/
│   │   └── page.tsx            # Documentation hub
│   ├── backups/
│   │   └── page.tsx            # Backup management
│   ├── dependencies/
│   │   └── page.tsx            # Dependency map
│   └── settings/
│       └── page.tsx            # Settings
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── app-sidebar.tsx         # Navigation sidebar
│   ├── command-menu.tsx        # Command palette
│   ├── status-badge.tsx        # Status indicator
│   ├── scripts-table.tsx       # Scripts data table
│   ├── execution-chart.tsx     # Execution charts
│   └── ...
├── lib/
│   ├── utils.ts                # Utility functions
│   ├── api.ts                  # API client
│   └── store.ts                # Zustand store
├── hooks/
│   ├── use-scripts.ts          # Scripts data hook
│   ├── use-monitoring.ts       # Monitoring data hook
│   └── ...
└── types/
    └── index.ts                # TypeScript types
```

---

## Data Types

```typescript
// types/index.ts

export interface Script {
  id: string
  name: string
  description: string
  parentFile: {
    id: string
    name: string
    type: "spreadsheet" | "document" | "standalone"
    url: string
  }
  status: "healthy" | "warning" | "error" | "inactive"
  type: "time-driven" | "on-edit" | "on-open" | "manual"
  triggers: Trigger[]
  externalAPIs: string[]
  sharedLibraries: string[]
  connectedFiles: ConnectedFile[]
  lastRun: Date | null
  nextRun: Date | null
  avgExecutionTime: number
  owner: string
  createdAt: Date
  updatedAt: Date
}

export interface Trigger {
  id: string
  type: "time-driven" | "on-edit" | "on-open" | "on-form-submit"
  function: string
  schedule?: string
  lastFire: Date | null
  nextFire: Date | null
  status: "enabled" | "disabled"
}

export interface Execution {
  id: string
  scriptId: string
  function: string
  startTime: Date
  endTime: Date
  duration: number
  status: "success" | "warning" | "error"
  message?: string
  stackTrace?: string
}

export interface Backup {
  id: string
  date: Date
  scriptsCount: number
  size: number
  status: "complete" | "partial" | "failed"
  path: string
}

export interface ConnectedFile {
  id: string
  name: string
  type: "spreadsheet" | "document" | "drive"
  url: string
  accessType: "read" | "write" | "read-write"
}
```

---

## Implementation Priority

### Phase 1: Core UI (Week 1)
1. Set up Next.js project with shadcn/ui
2. Implement layout with sidebar navigation
3. Create Dashboard overview page
4. Create Scripts inventory page with DataTable

### Phase 2: Script Management (Week 2)
5. Script detail page with tabs
6. Code viewer integration
7. Trigger management UI
8. Pull/Push actions

### Phase 3: Monitoring (Week 3)
9. Monitoring dashboard with charts
10. Error log viewer
11. Alert configuration
12. Real-time updates

### Phase 4: Documentation & Backups (Week 4)
13. Documentation hub
14. Backup management page
15. Dependency visualization
16. Settings page

### Phase 5: Polish (Week 5)
17. Command palette
18. Dark mode support
19. Mobile responsiveness
20. Performance optimization
