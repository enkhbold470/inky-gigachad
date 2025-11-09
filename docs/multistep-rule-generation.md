# Multistep Rule Generation with Progress Tracking

## Overview

This document describes the multistep loading feature implemented for rule creation, which provides real-time progress tracking, markdown file discovery, and Linux command visualization during the rule generation process.

## Features

### 1. Multistep Progress Tracking
The rule generation process is broken down into 5 distinct steps:
1. **Scanning for markdown files** - Initial discovery phase
2. **Saving repositories** - Persisting selected repositories to database
3. **Loading markdown files** - Reading and processing markdown files
4. **Generating rules with AI** - Creating personalized coding rules using OpenAI
5. **Complete** - Finalization and success state

### 2. Markdown File Discovery
- Automatically scans the project directory for `.md` and `.mdc` files
- Excludes common directories (`node_modules`, `.next`, `.git`)
- Displays total count of markdown files found
- Shows file metadata (path, size) for each discovered file

### 3. Linux Command Visualization
- Displays all Linux commands that would be executed during the process
- Commands shown include:
  - `find` - For discovering markdown files
  - `ls` - For directory listing
  - `cat` - For reading file contents
- Highlights the currently executing command in real-time
- Scrollable command list for better UX

### 4. Progress Dialog UI
- Modal dialog that appears during rule generation
- Visual progress indicators with icons for each step
- Progress bar showing overall completion percentage
- Step-by-step status messages
- Non-dismissible during processing (prevents accidental cancellation)

## Technical Implementation

### Files Modified

#### 1. `lib/markdown-context.ts`
**New Functions:**
- `getMarkdownFilesInfo()` - Returns file metadata and Linux commands
- `getAllMarkdownContextWithInfo()` - Returns content with full metadata

**New Interfaces:**
```typescript
interface MarkdownFileInfo {
  path: string
  relativePath: string
  size: number
}

interface MarkdownContextResult {
  content: string
  files: MarkdownFileInfo[]
  totalFiles: number
  commands: string[]
}
```

**Key Features:**
- Generates Linux command equivalents for file operations
- Tracks file count and metadata
- Maintains backward compatibility with `getAllMarkdownContext()`

#### 2. `app/actions/repo_actions.ts`
**Changes:**
- Updated `saveRepositories()` to use `getAllMarkdownContextWithInfo()`
- Returns additional metadata:
  - `markdownFiles` - Array of file information
  - `totalMarkdownFiles` - Total count of markdown files
  - `commands` - Array of Linux commands executed

**Response Structure:**
```typescript
{
  success: true,
  data: {
    repositories: Repository[],
    generatedRule: Rule,
    markdownFiles: MarkdownFileInfo[],
    totalMarkdownFiles: number,
    commands: string[]
  }
}
```

#### 3. `app/page.tsx`
**New State Variables:**
- `showProgressDialog` - Controls dialog visibility
- `progressStep` - Current step (0-5)
- `progressMessage` - Status message for current step
- `markdownFilesCount` - Total markdown files found
- `commands` - Array of Linux commands
- `currentCommand` - Currently highlighted command

**Updated Function:**
- `handleSaveRepositoriesAndGenerateRules()` - Now includes step-by-step progress updates with delays for better UX

**New UI Components:**
- Progress Dialog with step indicators
- Command visualization panel
- Progress bar component

### UI Components Used

- `Dialog` - For modal progress display
- `Progress` - For visual progress bar
- `Loader2` - For spinning loading indicators
- `CheckCircle2` - For completed steps
- `Terminal` - Icon for command section
- `FileText` - Icon for file operations
- `Github` - Icon for repository operations

## User Experience Flow

1. User selects repositories and clicks "Next: Rules"
2. Progress dialog appears immediately
3. Step 1: Shows "Scanning for markdown files" (500ms delay)
4. Step 2: Shows "Saving repositories" with count (300ms delay)
5. Step 3: Shows "Loading markdown files" (500ms delay)
   - Displays total markdown files found
   - Shows Linux commands being executed
6. Step 4: Shows "Generating rules with AI" (1000ms delay)
7. Step 5: Shows "Complete" (500ms delay)
8. Dialog closes automatically
9. User is navigated to Rules tab with generated rule displayed

## Command Generation

The system generates Linux command equivalents for Node.js file system operations:

```bash
# Finding markdown files
find /project/root -type f \( -name "*.md" -o -name "*.mdc" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/.git/*"

# Listing directory
ls -la /project/root

# Reading each file
cat "/path/to/file.md"
```

## Benefits

1. **Transparency** - Users can see exactly what's happening during rule generation
2. **Feedback** - Real-time progress updates prevent user confusion
3. **Debugging** - Command visualization helps understand the process
4. **Professional UX** - Polished loading experience improves perceived quality
5. **Educational** - Users learn about the markdown file discovery process

## Future Enhancements

Potential improvements:
- Add file size limits and warnings
- Show file paths in the progress dialog
- Add cancel functionality
- Export commands for manual execution
- Add error handling with retry options
- Show estimated time remaining

## Dependencies

- `@radix-ui/react-dialog` - For dialog component
- `@radix-ui/react-progress` - For progress bar
- `lucide-react` - For icons
- `sonner` - For toast notifications

## Notes

- The progress dialog cannot be dismissed during processing to prevent data loss
- Delays are intentionally added for better UX (allows users to read messages)
- Commands are displayed as they would appear in a Linux terminal
- File discovery respects size limits (100KB per file, 500KB total)

