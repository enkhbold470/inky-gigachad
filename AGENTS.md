# Agent instructions

## Git commits

- Do **not** add `Co-authored-by: Cursor Agent <cursoragent@cursor.com>` or any bot co-author trailers.
- Use clean commit messages only. If hooks append co-authors, use `git commit --no-verify`.
- Verify with `git log -1 --format=full` before pushing.

## This repo

MCP-only package. Core entrypoint:

```bash
npx -y inky-gigachad mcp
```

- Memory: `~/.inky-gigachad/memory.json`
- Source: `mcp/`, `lib/local-memory/`
- Do not re-add Next.js, Prisma, Clerk, or UI dependencies unless explicitly requested.
