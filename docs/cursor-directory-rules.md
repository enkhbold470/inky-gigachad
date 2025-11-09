# Cursor Directory Rules Integration Guide

This guide explains how to integrate industry-leading coding rules from cursor.directory into your Inky Gigachad project.

## Overview

The project includes 10 pre-configured rule templates from cursor.directory, covering various aspects of modern software development:

- **Full-Stack**: Next.js best practices
- **Backend**: API design patterns
- **Mobile**: React Native development
- **TypeScript**: Advanced type patterns
- **Database**: Design and optimization
- **Frontend**: Performance optimization
- **Security**: Best practices
- **Testing**: Comprehensive strategies
- **DevOps**: Deployment workflows
- **Best Practices**: Code quality and maintainability

## Database Schema

The `RuleTemplate` model includes an `author` field to track the source of rules:

```prisma
model RuleTemplate {
  id            String       @id @default(cuid())
  name          String       @unique
  description   String?
  content       String       @db.Text
  category      String?
  author        String?      // Added for attribution
  is_public     Boolean      @default(true)
  created_at    DateTime     @default(now())
  updated_at    DateTime     @updatedAt

  @@map("rule_templates")
}
```

## Seeding Rules

### Running the Seed Script

To populate your database with the industry leader rules:

```bash
# Using pnpm (recommended)
pnpm seed

# Or for development
pnpm seed:dev
```

The seed script will:
1. Create or update 10 rule templates
2. Categorize them appropriately
3. Set the author as "cursor.directory"
4. Handle duplicates gracefully with upsert operations

### Seed Script Location

The seed script is located at: `prisma/seed-cursor-rules.ts`

## Available Rule Templates

1. **Full-Stack Next.js Best Practices**
   - TypeScript usage
   - Architecture patterns
   - Database & ORM practices
   - Security & validation

2. **Backend API Design Patterns**
   - RESTful conventions
   - Error handling
   - Security measures
   - Performance optimization

3. **React Native Mobile Development**
   - Component patterns
   - State management
   - Performance optimization
   - Platform considerations

4. **TypeScript Advanced Patterns**
   - Type safety
   - Best practices
   - Code organization
   - Error handling

5. **Database Design & Optimization**
   - Schema design
   - Query optimization
   - Prisma best practices
   - Migration safety

6. **Frontend Performance Optimization**
   - React optimization
   - Next.js optimization
   - Asset optimization
   - Monitoring

7. **Security Best Practices**
   - Authentication & authorization
   - Input validation
   - API security
   - Data protection

8. **Testing Strategies**
   - Unit testing
   - Integration testing
   - Component testing
   - E2E testing

9. **DevOps & Deployment**
   - CI/CD pipeline
   - Environment management
   - Deployment practices
   - Monitoring

10. **Code Quality & Maintainability**
    - Code organization
    - Documentation
    - Code review
    - Refactoring

## Using Rules in Your Application

### Querying Rule Templates

```typescript
import { prisma } from '@/lib/prisma';

// Get all public rules
const rules = await prisma.ruleTemplate.findMany({
  where: { is_public: true },
});

// Get rules by category
const backendRules = await prisma.ruleTemplate.findMany({
  where: { category: 'Backend' },
});

// Get rules by author
const cursorRules = await prisma.ruleTemplate.findMany({
  where: { author: 'cursor.directory' },
});
```

### Creating User Rules from Templates

Users can create their own rules based on templates:

```typescript
const template = await prisma.ruleTemplate.findUnique({
  where: { name: 'Full-Stack Next.js Best Practices' },
});

const userRule = await prisma.rule.create({
  data: {
    user_id: userId,
    name: template.name,
    content: template.content,
    version: 1,
  },
});
```

## Migration

After adding the `author` field to the schema, run:

```bash
# Create migration
pnpm prisma migrate dev --name add_author_to_rule_template

# Apply migration
pnpm prisma migrate deploy
```

## Best Practices

1. **Regular Updates**: Keep rule templates updated with latest best practices
2. **Customization**: Allow users to customize templates for their specific needs
3. **Versioning**: Track rule versions to maintain history
4. **Attribution**: Always credit the source when using external rules
5. **Validation**: Validate rule content before saving

## Troubleshooting

### Seed Script Fails

- Ensure Prisma client is generated: `pnpm prisma generate`
- Check database connection in `.env`
- Verify schema is up to date

### Migration Issues

- Never run `npx prisma db push` in production
- Always review migration files before applying
- Test migrations in development first

## Contributing

To add new rule templates:

1. Edit `prisma/seed-cursor-rules.ts`
2. Add your rule to the `industryLeaderRules` array
3. Run `pnpm seed` to apply changes
4. Update this documentation

## Resources

- [Cursor Directory](https://cursor.directory) - Source of industry rules
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM docs
- [Next.js Documentation](https://nextjs.org/docs) - Framework docs

