# shadcn/ui monorepo template

This template is for creating a monorepo with shadcn/ui.

## Usage

```bash
pnpm dlx shadcn@latest init
```

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```

<!-- TASKMASTER_EXPORT_START -->
> 🎯 **Taskmaster Export** - 2025-06-30 02:26:52 UTC
> 📋 Export: with subtasks • Status filter: none
> 🔗 Powered by [Task Master](https://task-master.dev?utm_source=github-readme&utm_medium=readme-export&utm_campaign=pulsetrack&utm_content=task-export-link)

```
╭─────────────────────────────────────────────────────────╮╭─────────────────────────────────────────────────────────╮
│                                                         ││                                                         │
│   Project Dashboard                                     ││   Dependency Status & Next Task                         │
│   Tasks Progress: ░░░░░░░░░░░░░░░░░░░░ 0%    ││   Dependency Metrics:                                   │
│   0%                                                   ││   • Tasks with no dependencies: 3                      │
│   Done: 0  In Progress: 0  Pending: 24  Blocked: 0     ││   • Tasks ready to work on: 3                          │
│   Deferred: 0  Cancelled: 0                             ││   • Tasks blocked by dependencies: 21                    │
│                                                         ││   • Most depended-on task: #2 (14 dependents)           │
│   Subtasks Progress: ░░░░░░░░░░░░░░░░░░░░     ││   • Avg dependencies per task: 2.5                      │
│   0% 0%                                               ││                                                         │
│   Completed: 0/0  In Progress: 0  Pending: 0      ││   Next Task to Work On:                                 │
│   Blocked: 0  Deferred: 0  Cancelled: 0                 ││   ID: 1 - Implement CSV/Excel Import System     │
│                                                         ││   Priority: high  Dependencies: None                    │
│   Priority Breakdown:                                   ││   Complexity: N/A                                       │
│   • High priority: 9                                   │╰─────────────────────────────────────────────────────────╯
│   • Medium priority: 14                                 │
│   • Low priority: 1                                     │
│                                                         │
╰─────────────────────────────────────────────────────────╯
┌───────────┬──────────────────────────────────────┬─────────────────┬──────────────┬───────────────────────┬───────────┐
│ ID        │ Title                                │ Status          │ Priority     │ Dependencies          │ Complexi… │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 1         │ Implement CSV/Excel Import System    │ ○ pending       │ high         │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 2         │ Implement Multi-Format Export System │ ○ pending       │ high         │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 3         │ Create Data Import Templates and Map │ ○ pending       │ medium       │ 1                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 4         │ Implement Import Validation and Erro │ ○ pending       │ high         │ 1, 3                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 5         │ Build Scheduled Export System        │ ○ pending       │ medium       │ 2                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 6         │ Implement Automated Database Backup  │ ○ pending       │ high         │ None                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 7         │ Build Point-in-Time Recovery System  │ ○ pending       │ high         │ 6                     │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 8         │ Create Backup Restoration Interface  │ ○ pending       │ medium       │ 6, 7                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 9         │ Implement Disaster Recovery Procedur │ ○ pending       │ medium       │ 6, 7, 8               │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 10        │ Build Backup Testing and Validation  │ ○ pending       │ medium       │ 6, 8                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 11        │ Build Advanced Analytics Dashboard   │ ○ pending       │ high         │ 2, 5                  │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 12        │ Implement Custom Report Builder      │ ○ pending       │ high         │ 2, 5, 11              │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 13        │ Build Scheduled Report Generation Sy │ ○ pending       │ medium       │ 2, 5, 11, 12          │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 14        │ Create Performance Metrics and KPI S │ ○ pending       │ medium       │ 2, 11                 │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 15        │ Implement Data Visualization System  │ ○ pending       │ medium       │ 2, 11                 │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 16        │ Build Migration System from Other Pr │ ○ pending       │ medium       │ 1, 2, 3               │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 17        │ Create Data Transformation Utilities │ ○ pending       │ medium       │ 1, 2, 3               │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 18        │ Implement Migration Validation Syste │ ○ pending       │ medium       │ 1, 2, 7, 16, 17       │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 19        │ Build Migration Rollback System      │ ○ pending       │ low          │ 16, 18, 6, 7          │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 20        │ Implement GDPR Compliance Features   │ ○ pending       │ high         │ 1, 2, 4               │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 21        │ Create Data Retention Policy System  │ ○ pending       │ medium       │ 1, 2, 6, 20           │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 22        │ Implement Right to be Forgotten Syst │ ○ pending       │ high         │ 20, 2, 4              │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 23        │ Build Data Anonymization System      │ ○ pending       │ medium       │ 1, 2, 6, 7            │ N/A       │
├───────────┼──────────────────────────────────────┼─────────────────┼──────────────┼───────────────────────┼───────────┤
│ 24        │ Create Compliance Reporting System   │ ○ pending       │ medium       │ 20, 22, 2, 4, 6, 21   │ N/A       │
└───────────┴──────────────────────────────────────┴─────────────────┴──────────────┴───────────────────────┴───────────┘
```

╭────────────────────────────────────────────── ⚡ RECOMMENDED NEXT TASK ⚡ ──────────────────────────────────────────────╮
│                                                                                                                         │
│  🔥 Next Task to Work On: #1 - Implement CSV/Excel Import System                                  │
│                                                                                                                         │
│  Priority: high   Status: ○ pending                                                                                     │
│  Dependencies: None                                                                                                     │
│                                                                                                                         │
│  Description: Build comprehensive functionality to import bulk data from CSV and Excel files with column mapping, validation, and error handling for users, projects, tickets, and time tracking data.     │
│                                                                                                                         │
│  Start working: task-master set-status --id=1 --status=in-progress                                                     │
│  View details: task-master show 1                                                                      │
│                                                                                                                         │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯


╭──────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                      │
│   Suggested Next Steps:                                                              │
│                                                                                      │
│   1. Run task-master next to see what to work on next                                │
│   2. Run task-master expand --id=<id> to break down a task into subtasks             │
│   3. Run task-master set-status --id=<id> --status=done to mark a task as complete   │
│                                                                                      │
╰──────────────────────────────────────────────────────────────────────────────────────╯

> 📋 **End of Taskmaster Export** - Tasks are synced from your project using the `sync-readme` command.
<!-- TASKMASTER_EXPORT_END -->

