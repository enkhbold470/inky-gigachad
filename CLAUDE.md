# Claude / Coding Agent Notes

This repo is **inky-gigachad** — a local-first MCP memory server for Cursor, Claude Code, Codex, and Windsurf.

## Git commits — important

**Never add Cursor or bot co-authors to commits.**

- Do **not** include `Co-authored-by: Cursor Agent <cursoragent@cursor.com>`
- Do **not** include any `Co-authored-by` line for agents, bots, or cloud runners
- Prefer normal commit messages with no `Co-authored-by:` trailer at all
- If hooks append co-author metadata automatically, commit with `--no-verify` and confirm the message is clean before push

Check before push:

```bash
git log -1 --format=full
```

If you see `Co-authored-by: Cursor Agent` or `cursoragent@cursor.com`, amend or reword the commit and remove it.

## Product focus

- Main entrypoint: `npx -y inky-gigachad mcp`
- Memory file: `~/.inky-gigachad/memory.json`
- No Prisma, no Pinecone, no OpenAI required for the MCP CLI

## Code conventions

See [AGENTS.md](./AGENTS.md) for code style and architecture rules.
