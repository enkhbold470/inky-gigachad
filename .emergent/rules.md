# Project Rules

## General Rules

- Use pnpm
- Use lucide-react for icons
- Simple tailwindcss
- Use app route only
- OPENAI_API_KEY only
- Language: TypeScript
- Front-end: Next.js
- Back-end: Next.js Server Actions
- CSS UI: Tailwindcss, Shadcn
- DB: Serverless Postgres Neon
- ORM: Prisma
- Node: pnpm
- For placeholder images, use https://placekeanu.com/500
- When writing any readme.md file or license file, make sure not to include placeholder, always make it versatile

## Database Safety

Don't use "npm run dev" or other command to run website, I don't need that, instead just run lint error check.

Don't ever do `npx prisma db push` command, YOU MUST NOT DO THAT or mess with database related migrations.

!!! YOU MUST KEEP DATABASE SAFE !!!

### Command Execution Safety Protocol

You are a highly capable AI assistant with access to a shell or command-line interface. Your primary directive is to assist the user while ensuring the absolute safety and integrity of their system, data, and code. You must operate under the following strict set of safety protocols and blacklisted command patterns. These rules are non-negotiable.

#### Database Operations

This category prevents you from wiping, resetting, or destructively altering any database schema or data.

**Schema & Migration Commands:**
- db:push (e.g., npm run db:push, npx prisma db push)
- db:reset
- migrate:reset
- migrate:rollback
- schema:drop
- db:drop

**Direct Database CLI Commands:**
- mysql * --execute="DROP *"
- psql * --command="DROP *"
- psql * --command="TRUNCATE *"
- sqlite3 * "DROP *"
- mongo * --eval "db.dropDatabase()"
- redis-cli FLUSHALL
- redis-cli FLUSHDB

#### Version Control

This category prevents you from losing commit history, force-pushing over team members' work, or deleting branches.

**History Alteration & Force Pushes:**
- git push --force
- git push --force-with-lease
- git reset --hard *

**Data Deletion:**
- git clean -fdx
- git clean -f

**Branch & Tag Deletion:**
- git branch -D *
- git push * --delete *
- git tag -d *
- git push origin :<branch_name>

**History Rewriting:**
- git rebase *
- git filter-branch *
- git commit --amend

#### Package Management

This category prevents you from publishing packages, altering global configurations, or managing user authentication for package registries.

- npm publish
- yarn publish
- npm unpublish *
- npm owner add/rm *
- npm adduser / npm login
- npm logout
- npm config delete *

#### Filesystem Operations

This category prevents the deletion or destructive modification of source code, environment files, or other critical system files.

**Recursive & Wildcard Deletion:**
- rm -rf *
- rm -r *
- find . -delete

**Overwriting Critical Files:**
- \> .env
- \> *config.json
- mv * .env

**Moving Core Directories:**
- mv node_modules/* *
- mv .git/* *

#### Cloud Infrastructure Deployment

This category prevents you from destroying cloud resources, running up huge bills, or deploying untested code to production environments.

**Infrastructure as Code:**
- terraform destroy
- pulumi destroy

**Cloud Provider CLIs:**
- aws * terminate-*
- aws * delete-*
- aws * remove-*
- gcloud * delete
- gcloud * disable
- az * delete

**Deployment Scripts:**
- sls remove / serverless remove
- Any script with :prod or :production suffix (e.g., npm run deploy:prod)

#### System Permissions & Secrets

This category prevents you from escalating privileges, changing file permissions insecurely, or exposing sensitive secrets.

**Privilege Escalation:**
- sudo *
- su

**Permissions & Ownership:**
- chmod -R *
- chown -R *

**Exposing Secrets:**
- cat .env
- printenv
- cat ~/.ssh/id_rsa
- cat ~/.aws/credentials
- history

**System Commands:**
- shutdown
- reboot
- halt
- kill *
- pkill *

#### Core Safety Principles

Beyond specific commands, you must adhere to these guiding principles.

**Confirmation First:** For any action that modifies the filesystem, network state, or system configuration (even if not explicitly blacklisted), you must first state the exact command you intend to run and ask the user for explicit confirmation (y/n) before proceeding.

**Assume Least Privilege:** Operate as if you are in a sandboxed environment. Do not attempt actions that require elevated permissions.

**Prioritize Reversibility:** When possible, prefer non-destructive commands over destructive ones. For example, favor renaming a file (mv old new) over deleting it (rm old).

**Final Instruction:** If a user requests a command that matches or resembles any pattern on this blacklist, you must refuse and explain that the action is restricted for safety reasons. Prioritize data integrity and system stability above all else.

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.

## Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.
- Use snake_case for database columns.

## TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.

## Syntax and Formatting

- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.

## UI and Styling

- Use Shadcn UI, Radix, and Tailwind for components and styling.
- Implement responsive design with Tailwind CSS; use a mobile-first approach.
- Always edit global.css to use styles, don't ever hard code tailwindcss or styles in div or component itself, always refer global.css.

## Performance Optimization

- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Next.js Caching Strategy

- Use Next.js built-in caching utilities:
  - `unstable_cache` for caching data fetching/server actions.
  - Use `revalidate` for pages and cache timeouts.
- Cache database queries that rarely change. Set `revalidate` intervals (e.g., 3600 seconds for hourly refresh).
- **Do not cache** user-specific or highly dynamic data.
- Use cache tags (`cacheTag()`) for targeted cache invalidation.
- Example for caching and invalidation:
  ```typescript
  const getData = unstable_cache(fetchData, ["data-key"], { revalidate: 3600, tags: ["user-data"] });
  ```
- For API routes, set HTTP caching headers with `NextResponse`:
  ```typescript
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" }
  });
  ```
- Before implementing, check if data is static, semi-static, or fully dynamic and choose caching accordingly.
- Follow least privilege principle: Only cache what is safe and appropriate for all users.
- Use comments to document why/what you cache and invalidate.

## Key Conventions

- Use 'nuqs' for URL search parameter state management.
- Optimize Web Vitals (LCP, CLS, FID).
- Limit 'use client':
  - Favor server components and Next.js SSR.
  - Use only for Web API access in small components.
  - Avoid for data fetching or state management.

Follow Next.js docs for Data Fetching, Rendering, and Routing.

## Architecture

- Follow the repository pattern.
- Keep business logic in service layers.

## Prisma ORM and Data Validation

### Prisma Best Practices

**Connection Pooling:**
- Use connection pooling for serverless environments (Neon Postgres handles this automatically)
- Configure Prisma Client with appropriate connection pool settings
- Use `prisma.$connect()` sparingly; let Prisma manage connections automatically
- Close connections gracefully in edge cases only

**Transaction Handling:**
- Use transactions for operations that must be atomic
- Keep transactions short-lived to avoid connection pool exhaustion
- Example pattern:
```typescript
import { prisma } from "@/lib/prisma"

await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData })
  await tx.profile.create({ data: { userId: user.id, ...profileData } })
  return user
})
```

**Query Patterns:**
- Always use `select` to limit fields returned from database
- Use `include` judiciously; avoid deeply nested includes that cause N+1 queries
- Use `findUnique` with unique fields; use `findFirst` with non-unique fields
- Always handle null cases when using `findUnique` or `findFirst`
- Use `findMany` with pagination (skip/take) for lists
- Use database indexes for frequently queried fields

**Error Handling:**
- Handle Prisma errors gracefully:
  - `P2002`: Unique constraint violation
  - `P2025`: Record not found
  - `P2003`: Foreign key constraint violation
- Wrap Prisma queries in try-catch blocks
- Never expose Prisma error messages directly to clients

**Database Column Naming:**
- Use `snake_case` for all database columns (as per project rules)
- Map to camelCase in Prisma schema if preferred in application code

**Type Safety with Prisma:**
- Always use Prisma generated types for database models
- Use `Prisma.UserCreateInput`, `Prisma.UserUpdateInput`, etc.
- Combine with Zod for runtime validation when accepting external input
- Never use `any` or `unknown` without proper validation

**Query Optimization:**
- Use `select` to fetch only needed fields
- Use `include` for relations, but be mindful of depth
- Implement pagination with `skip` and `take`
- Use database indexes for frequently queried columns
- Avoid `select *` in production queries
- Use `findUnique` over `findFirst` when possible (uses indexes)

**Database Migrations:**
- Never run `npx prisma db push` in production (as per safety rules)
- Use `prisma migrate dev` for development
- Review migration files before applying
- Test migrations on staging before production

### Data Validation Strategy

**When to Validate:**
1. **API Routes**: Always validate on entry with Zod
2. **Server Actions**: Always validate inputs with Zod
3. **Form Submissions**: Validate client-side for UX, but always re-validate server-side
4. **Database Queries**: Validate parameters before querying (IDs, filters, etc.)

**Validation Layers:**
1. **Schema Definition**: Define Zod schemas in shared location (`lib/validations/`)
2. **Type Generation**: Export TypeScript types from Zod schemas: `z.infer<typeof schema>`
3. **Reuse Schemas**: Reuse schemas across API routes and Server Actions

## Security and Error Handling

### Error Handling Patterns

**Server Actions:**
- Always use typed error responses with consistent structure: `{ success: boolean, error?: string, data?: T }`
- Wrap all Server Actions in try-catch blocks
- Never expose internal error details to clients; log full errors server-side
- Use Zod for input validation; return validation errors in consistent format

**API Routes:**
- Always return consistent error response format: `{ error: string, statusCode: number }`
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)
- Never expose stack traces or internal details in production
- Validate all inputs with Zod before processing

**Client Components:**
- Use error boundaries for error handling in React components
- Handle loading and error states explicitly
- Show user-friendly error messages
- Log errors to monitoring service if available

### Logging Strategy

- Use structured logging with context (userId, requestId, etc.)
- Log at appropriate levels: error, warn, info, debug
- Never log sensitive data (passwords, tokens, PII)
- Log all errors with full context for debugging
- Use console.error for errors, console.warn for warnings
- Consider implementing request ID tracking for debugging

### Environment Variable Validation

- Always validate environment variables at application startup
- Use Zod schema to validate and type environment variables
- Fail fast if required environment variables are missing

### API Security

**Rate Limiting:**
- Implement rate limiting on all API routes and Server Actions
- Use reasonable limits (e.g., 10 requests per minute per IP for AI endpoints)
- Return 429 status code when rate limit exceeded
- Log rate limit violations

**Input Sanitization:**
- Always validate AND sanitize user inputs
- Use Zod for validation, sanitize with appropriate libraries for XSS prevention
- Never trust client-side validation alone
- Sanitize HTML content if allowing user-generated HTML
- Escape user input when displaying in UI

**Request Security:**
- Set appropriate request size limits (e.g., 1MB for JSON, 10MB for file uploads)
- Validate Content-Type headers
- Implement CORS properly if needed (default Next.js CORS is usually sufficient)
- Use HTTPS in production (enforced by hosting platform)

**Authentication/Authorization:**
- If using Clerk, protect routes with middleware
- Verify authentication in Server Actions before processing
- Check authorization/permissions before accessing resources
- Never trust client-side auth state; always verify server-side

### Error Response Format

All API errors should follow this structure:
```typescript
{
  success: false,
  error: "Human-readable error message",
  code?: "ERROR_CODE", // Optional error code for client handling
  details?: object // Optional additional details (dev only)
}
```

All successful responses:
```typescript
{
  success: true,
  data: T // The actual response data
}
```

## Testing and Quality Assurance

### Testing Strategy

**Testing Framework:**
- Use Vitest for unit and integration tests (lightweight, fast, ESM support)
- Use Playwright or React Testing Library for component tests if needed
- Keep tests simple and focused on behavior, not implementation

**Test File Organization:**
- Co-locate test files with source files: `component.test.ts` next to `component.tsx`
- Or organize in `__tests__` directories: `__tests__/component.test.ts`
- Use `.test.ts` or `.spec.ts` extension

**Test Quality Guidelines:**
- Write tests before or alongside code (TDD/BDD when possible)
- Keep tests independent and isolated
- Use descriptive test names: `describe("feature", () => { it("should do X when Y", ...) })`
- Mock external dependencies (database, APIs, file system)
- Test edge cases and error conditions
- Aim for high coverage of critical paths, not 100% coverage

### Code Quality

**Linting:**
- Use ESLint with TypeScript rules
- Run linting before committing: `pnpm lint`
- Fix all linting errors before pushing code
- Use ESLint auto-fix when safe: `pnpm lint --fix`

**Type Checking:**
- Ensure TypeScript compiles without errors: `pnpm tsc --noEmit`
- Don't use `@ts-ignore` or `@ts-expect-error` without justification
- Prefer type-safe patterns over type assertions
- Use `unknown` before casting to specific types

**Pre-commit Checks:**
- Run linting: `pnpm lint`
- Run type checking: `pnpm tsc --noEmit`
- Run tests: `pnpm test` (if test suite exists)
- Don't commit if any checks fail

**Performance Testing:**
- Monitor bundle size for client-side code
- Profile slow database queries
- Use Next.js built-in performance metrics
- Monitor API response times
- Test with realistic data volumes

**Accessibility Testing:**
- Use automated tools (axe, Lighthouse) in CI/CD
- Test keyboard navigation
- Test screen reader compatibility
- Ensure proper ARIA labels and roles
- Verify color contrast ratios
- Test with actual assistive technologies when possible

