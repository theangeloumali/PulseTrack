# Claude Collaboration File

This file helps Claude understand this project to provide more relevant and accurate assistance. By keeping this file updated, you can improve the AI's ability to help with development tasks.

## 1. Project Overview

This is a web application for a project management system that includes ticket tracking, user management, time tracking, and billing features. It's built with Next.js 15 and Supabase as a monorepo using Turbo and pnpm workspaces.

## 2. Tech Stack

**Frontend:**
* Framework: Next.js 15 (React 19) with App Router
* Styling: Tailwind CSS, shadcn/ui components
* State Management: Zustand
* Data Fetching: TanStack Query (React Query)
* Forms: React Hook Form with Zod validation
* Themes: next-themes
* Icons: Lucide React

**Backend:**
* Framework: Next.js 15 API Routes
* Database: Supabase (PostgreSQL)
* ORM: Drizzle ORM
* Authentication: Supabase Auth
* Analytics: Vercel Analytics

**Development:**
* Monorepo: Turbo with pnpm workspaces
* Package Manager: pnpm
* TypeScript: 5.7.3
* Build Tool: Turbo
* Linting: ESLint with custom workspace config

## 3. Getting Started & Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in the required Supabase values.
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

3. **Run database migrations:**
   ```bash
   cd apps/web && pnpm migration:run
   ```

## 4. Common Commands

* **Run development server:**
  ```bash
  pnpm dev
  ```

* **Build for production:**
  ```bash
  pnpm build
  ```

* **Run linter:**
  ```bash
  pnpm lint
  ```

* **Check for type errors:**
  ```bash
  cd apps/web && pnpm typecheck
  ```

* **Generate database migrations:**
  ```bash
  cd apps/web && pnpm migration:generate
  ```

* **Run database migrations:**
  ```bash
  cd apps/web && pnpm migration:run
  ```

## 5. Directory Structure Overview

* `apps/web/`: Main Next.js application
* `apps/web/app/`: Next.js App Router pages and API routes
* `apps/web/components/`: Shared React components and UI components
* `apps/web/lib/`: Core application logic, database queries, and utility functions
* `apps/web/lib/db/`: Drizzle ORM schema, queries, and database service logic
* `apps/web/lib/supabase/`: Supabase client and helper configurations
* `apps/web/screens/`: Page-specific components and screens
* `apps/web/tests/`: Test files and debugging utilities
* `packages/`: Shared workspace packages
* `.taskmaster/`: Task Master AI configuration and tasks
* `docs/`: **Comprehensive project documentation** - See [Documentation Overview](#8-project-documentation)

## 6. Coding Conventions & Style

* Follow Next.js 15 App Router conventions
* All database interactions should go through the service layer in `lib/db/service.ts`
* Use named exports instead of default exports for components
* API routes should be organized by feature under `app/api/`
* Use Drizzle ORM for all database operations
* Supabase Auth for authentication and authorization
* TanStack Query for data fetching and caching
* Zustand for client-side state management
* **IMPORTANT**: Always run `pnpm build` after making changes to ensure the project builds without errors
* **IMPORTANT**: Always run `pnpm typecheck` to check for TypeScript errors
* **IMPORTANT**: Use `pnpm lint` to check for linting issues

## 7. Deployment

The application is deployed to Vercel. Pushes to the `main` branch trigger an automatic production deployment. Preview deployments are created for all pull requests.

## 8. Project Documentation

**Comprehensive documentation is available in the [`docs/`](./docs/) folder:**

### Core System Documentation
- **[`docs/role-system.md`](./docs/role-system.md)** - Complete role-based access control system
  - Role hierarchy: Super Admin → System Admin → Company Admin → Manager → User
  - Permission matrices and access controls
  - Implementation details and usage patterns
  
- **[`docs/authentication.md`](./docs/authentication.md)** - Authentication and authorization guide
  - Supabase Auth integration
  - User registration and invitation flows
  - Session management and security

- **[`docs/database-schema.md`](./docs/database-schema.md)** - Database structure and relationships
  - Complete schema documentation
  - Enum types and constraints
  - Performance indexes and security considerations

- **[`docs/api-endpoints.md`](./docs/api-endpoints.md)** - API documentation and usage
  - Complete endpoint reference
  - Authentication and authorization patterns
  - Error handling and rate limiting

### Quick Reference
- **Role Permissions**: See [`docs/role-system.md`](./docs/role-system.md) for complete role hierarchy
- **API Security**: Check [`docs/api-endpoints.md`](./docs/api-endpoints.md) for authentication patterns
- **Database Access**: Reference [`docs/database-schema.md`](./docs/database-schema.md) for schema details

**Important**: Always reference the documentation when working with roles, permissions, or database operations to ensure consistency and security.

---

# Task Master AI - Claude Code Integration Guide

## Essential Commands

### Core Workflow Commands

```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information (e.g., task-master show 1.2)
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks

# Dependencies & Organization
task-master add-dependency --id=<id> --depends-on=<id>       # Add task dependency
task-master move --from=<id> --to=<id>                       # Reorganize task hierarchy
task-master validate-dependencies                            # Check for dependency issues
task-master generate                                         # Update task markdown files (usually auto-called)
```

## Key Files & Project Structure

### Core Files

- `.taskmaster/tasks/tasks.json` - Main task data file (auto-managed)
- `.taskmaster/config.json` - AI model configuration (use `task-master models` to modify)
- `.taskmaster/docs/prd.txt` - Product Requirements Document for parsing
- `.taskmaster/tasks/*.txt` - Individual task files (auto-generated from tasks.json)
- `.env` - API keys for CLI usage

### Claude Code Integration Files

- `CLAUDE.md` - Auto-loaded context for Claude Code (this file)
- `.claude/settings.json` - Claude Code tool allowlist and preferences
- `.claude/commands/` - Custom slash commands for repeated workflows
- `.mcp.json` - MCP server configuration (project-specific)

### Directory Structure

```
project/
├── .taskmaster/
│   ├── tasks/              # Task files directory
│   │   ├── tasks.json      # Main task database
│   │   ├── task-1.md      # Individual task files
│   │   └── task-2.md
│   ├── docs/              # Documentation directory
│   │   ├── prd.txt        # Product requirements
│   ├── reports/           # Analysis reports directory
│   │   └── task-complexity-report.json
│   ├── templates/         # Template files
│   │   └── example_prd.txt  # Example PRD template
│   └── config.json        # AI models & settings
├── .claude/
│   ├── settings.json      # Claude Code configuration
│   └── commands/         # Custom slash commands
├── .env                  # API keys
├── .mcp.json            # MCP configuration
└── CLAUDE.md            # This file - auto-loaded by Claude Code
```

## MCP Integration

Task Master provides an MCP server that Claude Code can connect to. Configure in `.mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here",
        "OPENAI_API_KEY": "OPENAI_API_KEY_HERE",
        "GOOGLE_API_KEY": "GOOGLE_API_KEY_HERE",
        "XAI_API_KEY": "XAI_API_KEY_HERE",
        "OPENROUTER_API_KEY": "OPENROUTER_API_KEY_HERE",
        "MISTRAL_API_KEY": "MISTRAL_API_KEY_HERE",
        "AZURE_OPENAI_API_KEY": "AZURE_OPENAI_API_KEY_HERE",
        "OLLAMA_API_KEY": "OLLAMA_API_KEY_HERE"
      }
    }
  }
}
```

### Essential MCP Tools

```javascript
help; // = shows available taskmaster commands
// Project setup
initialize_project; // = task-master init
parse_prd; // = task-master parse-prd

// Daily workflow
get_tasks; // = task-master list
next_task; // = task-master next
get_task; // = task-master show <id>
set_task_status; // = task-master set-status

// Task management
add_task; // = task-master add-task
expand_task; // = task-master expand
update_task; // = task-master update-task
update_subtask; // = task-master update-subtask
update; // = task-master update

// Analysis
analyze_project_complexity; // = task-master analyze-complexity
complexity_report; // = task-master complexity-report
```

## Claude Code Workflow Integration

### Standard Development Workflow

#### 1. Project Initialization

```bash
# Initialize Task Master
task-master init

# Create or obtain PRD, then parse it
task-master parse-prd .taskmaster/docs/prd.txt

# Analyze complexity and expand tasks
task-master analyze-complexity --research
task-master expand --all --research
```

If tasks already exist, another PRD can be parsed (with new information only!) using parse-prd with --append flag. This will add the generated tasks to the existing list of tasks..

#### 2. Daily Development Loop

```bash
# Start each session
task-master next                           # Find next available task
task-master show <id>                     # Review task details

# During implementation, check in code context into the tasks and subtasks
task-master update-subtask --id=<id> --prompt="implementation notes..."

# Complete tasks
task-master set-status --id=<id> --status=done
```

#### 3. Multi-Claude Workflows

For complex projects, use multiple Claude Code sessions:

```bash
# Terminal 1: Main implementation
cd project && claude

# Terminal 2: Testing and validation
cd project-test-worktree && claude

# Terminal 3: Documentation updates
cd project-docs-worktree && claude
```

### Custom Slash Commands

Create `.claude/commands/taskmaster-next.md`:

```markdown
Find the next available Task Master task and show its details.

Steps:

1. Run `task-master next` to get the next task
2. If a task is available, run `task-master show <id>` for full details
3. Provide a summary of what needs to be implemented
4. Suggest the first implementation step
```

Create `.claude/commands/taskmaster-complete.md`:

```markdown
Complete a Task Master task: $ARGUMENTS

Steps:

1. Review the current task with `task-master show $ARGUMENTS`
2. Verify all implementation is complete
3. Run any tests related to this task
4. Mark as complete: `task-master set-status --id=$ARGUMENTS --status=done`
5. Show the next available task with `task-master next`
```

## Tool Allowlist Recommendations

Add to `.claude/settings.json`:

```json
{
  "allowedTools": [
    "Edit",
    "Bash(task-master *)",
    "Bash(git commit:*)",
    "Bash(git add:*)",
    "Bash(npm run *)",
    "mcp__task_master_ai__*"
  ]
}
```

## Configuration & Setup

### API Keys Required

At least **one** of these API keys must be configured:

- `ANTHROPIC_API_KEY` (Claude models) - **Recommended**
- `PERPLEXITY_API_KEY` (Research features) - **Highly recommended**
- `OPENAI_API_KEY` (GPT models)
- `GOOGLE_API_KEY` (Gemini models)
- `MISTRAL_API_KEY` (Mistral models)
- `OPENROUTER_API_KEY` (Multiple models)
- `XAI_API_KEY` (Grok models)

An API key is required for any provider used across any of the 3 roles defined in the `models` command.

### Model Configuration

```bash
# Interactive setup (recommended)
task-master models --setup

# Set specific models
task-master models --set-main claude-3-5-sonnet-20241022
task-master models --set-research perplexity-llama-3.1-sonar-large-128k-online
task-master models --set-fallback gpt-4o-mini
```

## Task Structure & IDs

### Task ID Format

- Main tasks: `1`, `2`, `3`, etc.
- Subtasks: `1.1`, `1.2`, `2.1`, etc.
- Sub-subtasks: `1.1.1`, `1.1.2`, etc.

### Task Status Values

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `deferred` - Postponed
- `cancelled` - No longer needed
- `blocked` - Waiting on external factors

### Task Fields

```json
{
  "id": "1.2",
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system",
  "status": "pending",
  "priority": "high",
  "dependencies": ["1.1"],
  "details": "Use bcrypt for hashing, JWT for tokens...",
  "testStrategy": "Unit tests for auth functions, integration tests for login flow",
  "subtasks": []
}
```

## Claude Code Best Practices with Task Master

### Context Management

- Use `/clear` between different tasks to maintain focus
- This CLAUDE.md file is automatically loaded for context
- Use `task-master show <id>` to pull specific task context when needed

### Iterative Implementation

1. `task-master show <subtask-id>` - Understand requirements
2. Explore codebase and plan implementation
3. `task-master update-subtask --id=<id> --prompt="detailed plan"` - Log plan
4. `task-master set-status --id=<id> --status=in-progress` - Start work
5. Implement code following logged plan
6. `task-master update-subtask --id=<id> --prompt="what worked/didn't work"` - Log progress
7. `task-master set-status --id=<id> --status=done` - Complete task

### Complex Workflows with Checklists

For large migrations or multi-step processes:

1. Create a markdown PRD file describing the new changes: `touch task-migration-checklist.md` (prds can be .txt or .md)
2. Use Taskmaster to parse the new prd with `task-master parse-prd --append` (also available in MCP)
3. Use Taskmaster to expand the newly generated tasks into subtasks. Consdier using `analyze-complexity` with the correct --to and --from IDs (the new ids) to identify the ideal subtask amounts for each task. Then expand them.
4. Work through items systematically, checking them off as completed
5. Use `task-master update-subtask` to log progress on each task/subtask and/or updating/researching them before/during implementation if getting stuck

### Git Integration

Task Master works well with `gh` CLI:

```bash
# Create PR for completed task
gh pr create --title "Complete task 1.2: User authentication" --body "Implements JWT auth system as specified in task 1.2"

# Reference task in commits
git commit -m "feat: implement JWT auth (task 1.2)"
```

### Parallel Development with Git Worktrees

```bash
# Create worktrees for parallel task development
git worktree add ../project-auth feature/auth-system
git worktree add ../project-api feature/api-refactor

# Run Claude Code in each worktree
cd ../project-auth && claude    # Terminal 1: Auth work
cd ../project-api && claude     # Terminal 2: API work
```

## Troubleshooting

### AI Commands Failing

```bash
# Check API keys are configured
cat .env                           # For CLI usage

# Verify model configuration
task-master models

# Test with different model
task-master models --set-fallback gpt-4o-mini
```

### MCP Connection Issues

- Check `.mcp.json` configuration
- Verify Node.js installation
- Use `--mcp-debug` flag when starting Claude Code
- Use CLI as fallback if MCP unavailable

### Task File Sync Issues

```bash
# Regenerate task files from tasks.json
task-master generate

# Fix dependency issues
task-master fix-dependencies
```

DO NOT RE-INITIALIZE. That will not do anything beyond re-adding the same Taskmaster core files.

## Important Notes

### AI-Powered Operations

These commands make AI calls and may take up to a minute:

- `parse_prd` / `task-master parse-prd`
- `analyze_project_complexity` / `task-master analyze-complexity`
- `expand_task` / `task-master expand`
- `expand_all` / `task-master expand --all`
- `add_task` / `task-master add-task`
- `update` / `task-master update`
- `update_task` / `task-master update-task`
- `update_subtask` / `task-master update-subtask`

### File Management

- Never manually edit `tasks.json` - use commands instead
- Never manually edit `.taskmaster/config.json` - use `task-master models`
- Task markdown files in `tasks/` are auto-generated
- Run `task-master generate` after manual changes to tasks.json

### Claude Code Session Management

- Use `/clear` frequently to maintain focused context
- Create custom slash commands for repeated Task Master workflows
- Configure tool allowlist to streamline permissions
- Use headless mode for automation: `claude -p "task-master next"`

### Multi-Task Updates

- Use `update --from=<id>` to update multiple future tasks
- Use `update-task --id=<id>` for single task updates
- Use `update-subtask --id=<id>` for implementation logging

### Research Mode

- Add `--research` flag for research-based AI enhancement
- Requires a research model API key like Perplexity (`PERPLEXITY_API_KEY`) in environment
- Provides more informed task creation and updates
- Recommended for complex technical tasks

---

_This guide ensures Claude Code has immediate access to Task Master's essential functionality for agentic development workflows._

---

# Claude Development Workflow Instructions

## CRITICAL: Task Master Integration Required

## MANDATORY: Task Master Updates for New Features

**ALWAYS update Task Master whenever implementing new features or significant changes:**

1. **After completing any new feature or major fix:**
   - Run `task-master add-task --prompt="[Description of implemented feature]" --research`
   - Immediately mark as completed: `task-master set-status --id=<new-id> --status=done`
   - **MANDATORY**: Run `pnpm build` to ensure no build errors
   - **MANDATORY**: Run `pnpm typecheck` to verify TypeScript compilation

2. **Examples of changes that MUST be added to Task Master:**
   - New API endpoints or routes
   - New UI components or pages
   - Bug fixes that affect functionality
   - Performance improvements
   - Security enhancements
   - Database schema changes
   - Authentication/authorization changes
   - Query optimization fixes
   - Role management updates

3. **Task Master serves as the source of truth for:**
   - Project completion status
   - Feature implementation history
   - Development progress tracking
   - Code review and handoff documentation

**Failure to update Task Master means features are not officially "complete" and may be overlooked in project planning.**

## MANDATORY: Build Verification Steps

**EVERY completed task MUST pass these verification steps:**

1. **TypeScript Compilation Check:**
   ```bash
   pnpm typecheck
   ```
   - Must complete with no errors
   - If errors exist, fix them before marking task complete

2. **Build Verification:**
   ```bash
   pnpm build
   ```
   - Must complete successfully without errors
   - If build fails, resolve issues before proceeding

3. **Task Master Update:**
   ```bash
   task-master add-task --prompt="[Description of completed work]" --research
   task-master set-status --id=<new-id> --status=done
   ```

**These steps are NON-NEGOTIABLE and MUST be completed for every development task.**

**ALL development work MUST follow the Task Master workflow:**

1. **Before starting any development task:**
   - Run `task-master list` to see current tasks
   - Run `task-master next` to get the next task to work on
   - Run `task-master show <id>` to understand task requirements

2. **During development:**
   - Mark task as in-progress: `task-master set-status --id=<id> --status=in-progress`
   - Log implementation notes: `task-master update-subtask --id=<id> --prompt="detailed implementation notes"`
   - NEVER work on tasks that haven't been assigned or are blocked by dependencies

3. **After completing work:**
   - **MANDATORY**: Run `pnpm build` to ensure no build errors
   - **MANDATORY**: Run `pnpm typecheck` to verify TypeScript compilation
   - Mark task as complete: `task-master set-status --id=<id> --status=done`
   - Run `task-master next` to get the next available task

4. **For complex tasks:**
   - Break down using: `task-master expand --id=<id> --research`
   - Update multiple tasks: `task-master update --from=<id> --prompt="changes"`

## Development Rules

- **ALWAYS** follow the Task Master workflow - no exceptions
- **NEVER** work on features not defined in Task Master tasks
- **ALWAYS** reference task IDs in commit messages (e.g., "feat: implement auth system (task 11)")
- **ALWAYS** check task dependencies before starting work
- **ALWAYS** run `pnpm build` and `pnpm typecheck` after code changes
- **ONLY** create new files when absolutely necessary for the assigned task

## Current Project Status

This project has 34 defined tasks in Task Master (IDs 11-34), with 18 completed, 1 in progress, and 6 pending. Always check `task-master list` for current status and work only on the next available task from `task-master next`.

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
