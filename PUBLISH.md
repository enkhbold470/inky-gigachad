# Publish to npm (owner must run this)

I cannot publish on your behalf from this sandbox — no valid `NPM_TOKEN` is configured.

## One-time setup

1. Create/login at https://www.npmjs.com/
2. Claim the package name `inky-gigachad` (currently **not** on npm)
3. Create an automation token: npm → Access Tokens → Granular → Publish

## Publish

```bash
pnpm install
pnpm test
npm login
# or: export NPM_TOKEN=npm_xxx

npm publish --access public
```

After publish, users run:

```bash
npx -y inky-gigachad mcp
```

## Without npm publish (works today)

```bash
git clone https://github.com/enkhbold470/inky-gigachad
cd inky-gigachad
pnpm install && pnpm build
pnpm mcp
```

Or from a packed tarball:

```bash
npm pack
npx -y ./inky-gigachad-0.3.0.tgz mcp
```
