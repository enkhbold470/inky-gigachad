# Cursor Rules Quick Start Guide

Quick reference for using industry leader rules in Inky Gigachad.

## Quick Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm prisma generate

# 3. Run migrations (if needed)
pnpm prisma migrate dev

# 4. Seed industry leader rules
pnpm seed
```

## Available Commands

```bash
# Seed rules
pnpm seed

# Development seed
pnpm seed:dev

# Generate Prisma client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name migration_name

# View database
pnpm prisma studio
```

## Rule Categories

- **Full-Stack**: Next.js best practices
- **Backend**: API design patterns  
- **Mobile**: React Native development
- **TypeScript**: Advanced patterns
- **Database**: Design & optimization
- **Frontend**: Performance optimization
- **Security**: Best practices
- **Testing**: Comprehensive strategies
- **DevOps**: Deployment workflows
- **Best Practices**: Code quality

## Using Rules

### Get All Rules
```typescript
const rules = await prisma.ruleTemplate.findMany({
  where: { is_public: true }
});
```

### Get by Category
```typescript
const backendRules = await prisma.ruleTemplate.findMany({
  where: { category: 'Backend' }
});
```

### Create User Rule from Template
```typescript
const template = await prisma.ruleTemplate.findUnique({
  where: { name: 'Full-Stack Next.js Best Practices' }
});

await prisma.rule.create({
  data: {
    user_id: userId,
    name: template.name,
    content: template.content,
    version: 1
  }
});
```

## Important Notes

⚠️ **Never run** `npx prisma db push` in production
✅ **Always use** `prisma migrate dev` for schema changes
✅ **Always validate** environment variables at startup
✅ **Always use** Zod for input validation

## Troubleshooting

**Seed fails?**
- Check DATABASE_URL in .env
- Run `pnpm prisma generate`
- Verify schema is synced

**Migration issues?**
- Review migration files
- Test in development first
- Never force migrations in production

## Next Steps

1. Review seeded rules in Prisma Studio
2. Customize rules for your needs
3. Create user-specific rules from templates
4. Integrate rules into your coding sessions

For detailed documentation, see `docs/cursor-directory-rules.md`

