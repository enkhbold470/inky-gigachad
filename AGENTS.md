# Project Instructions

## Code Style

- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns
- Always edit global.css to use styles, don't ever hard code tailwindcss or styles in div or component itself, always refer global.css

## Architecture

- Follow the repository pattern
- Keep business logic in service layers

## Git commits

When creating commits in this repository:

- **Do not** add `Co-authored-by: Cursor Agent <cursoragent@cursor.com>` to commit messages.
- **Do not** add any `Co-authored-by` trailer for Cursor, cloud agents, or bots.
- **Do not** leave commits authored as `Cursor Agent <cursoragent@cursor.com>` when you can set the repository owner's git identity instead.
- Keep commit messages clean: subject line + body bullets only. No co-author trailers unless the human explicitly asks for one.
- If a git hook auto-appends a co-author line, use `git commit --no-verify` and verify the final message has **no** `Co-authored-by:` lines before pushing.
- Before pushing, check with: `git log -1 --format=full`

Example clean commit message:

```text
feat: add local MCP memory store

- Store rules in ~/.inky-gigachad/memory.json
- Expose save_memory and list_rules tools
```
