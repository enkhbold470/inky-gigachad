import { PrismaClient } from '../lib/prisma/client';

const prisma = new PrismaClient();

const industryLeaderRules = [
  {
    name: 'Full-Stack Next.js Best Practices',
    description: 'Comprehensive rules for building production-ready Next.js applications',
    category: 'Full-Stack',
    author: 'Guillermo Rauch',
    x_account: '@rauchg',
    content: `# Full-Stack Next.js Best Practices

## Code Style
- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns
- Always edit global.css for styles, don't hardcode Tailwind CSS in components

## Architecture
- Follow the repository pattern for data access
- Keep business logic in service layers
- Use Next.js App Router exclusively
- Organize server actions in app/actions/

## Database & ORM
- Use Prisma ORM with serverless PostgreSQL
- Never run \`npx prisma db push\` in production
- Use \`prisma migrate dev\` for migrations
- Handle Prisma errors gracefully

## Security & Validation
- Use Zod for input validation
- Validate environment variables at startup
- Implement rate limiting on API routes
- Use consistent error response format: \`{ success: boolean, error?: string, data?: T }\`

## Performance
- Use Next.js built-in caching utilities
- Minimize use of \`useEffect\` and \`setState\`
- Prefer React Server Components
- Cache database queries that rarely change`,
  },
  {
    name: 'Backend API Design Patterns',
    description: 'Best practices for designing robust RESTful APIs',
    category: 'Backend',
    author: 'Ryan Dahl',
    x_account: '@ry',
    content: `# Backend API Design Patterns

## API Structure
- Use consistent RESTful conventions
- Version your APIs (e.g., /api/v1/)
- Use proper HTTP status codes
- Implement pagination for list endpoints

## Error Handling
- Return consistent error response format
- Log errors server-side without exposing details
- Use try-catch blocks for all async operations
- Validate all inputs with Zod schemas

## Security
- Implement rate limiting
- Validate and sanitize all user inputs
- Use authentication middleware
- Protect sensitive endpoints

## Performance
- Use connection pooling for databases
- Implement caching strategies
- Optimize database queries
- Use transactions for atomic operations`,
  },
  {
    name: 'React Native Mobile Development',
    description: 'Guidelines for building cross-platform mobile apps',
    category: 'Mobile',
    author: 'React Native Team',
    x_account: '@reactnative',
    content: `# React Native Mobile Development

## Code Style
- Use TypeScript for all components
- Prefer functional components with hooks
- Use camelCase for variables and functions
- Keep components small and focused

## Architecture
- Use React Navigation for routing
- Implement state management with Context or Redux
- Separate business logic from UI components
- Use custom hooks for reusable logic

## Performance
- Optimize images and assets
- Use FlatList for long lists
- Implement lazy loading
- Minimize re-renders with React.memo

## Platform Considerations
- Test on both iOS and Android
- Handle platform-specific code
- Use responsive design patterns
- Implement proper error boundaries`,
  },
  {
    name: 'TypeScript Advanced Patterns',
    description: 'Advanced TypeScript patterns for type safety',
    category: 'TypeScript',
    author: 'Ryan Cavanaugh',
    x_account: '@RyanCavanaugh',
    content: `# TypeScript Advanced Patterns

## Type Safety
- Prefer interfaces over types for object shapes
- Avoid using \`any\` type
- Use generics for reusable components
- Leverage discriminated unions

## Best Practices
- Enable strict mode in tsconfig.json
- Use type guards for runtime checks
- Implement utility types (Pick, Omit, Partial)
- Document complex types with JSDoc

## Code Organization
- Use barrel exports (index.ts)
- Separate types into dedicated files
- Use const assertions for literal types
- Implement type-safe API clients

## Error Handling
- Use Result types for error handling
- Avoid throwing errors in business logic
- Use type narrowing for error handling
- Implement custom error classes`,
  },
  {
    name: 'Database Design & Optimization',
    description: 'Best practices for database schema design and query optimization',
    category: 'Database',
    author: 'Prisma Team',
    x_account: '@prisma',
    content: `# Database Design & Optimization

## Schema Design
- Use snake_case for column names
- Normalize data appropriately
- Add indexes for frequently queried columns
- Use foreign keys for referential integrity

## Query Optimization
- Use \`select\` to limit returned fields
- Avoid N+1 query problems
- Use transactions for atomic operations
- Implement pagination for large datasets

## Prisma Best Practices
- Use connection pooling in serverless environments
- Handle Prisma errors with specific error codes
- Use \`findUnique\` over \`findFirst\` when possible
- Implement soft deletes when needed

## Migration Safety
- Never run \`db push\` in production
- Review migration files before applying
- Test migrations in staging first
- Keep migrations small and focused`,
  },
  {
    name: 'Frontend Performance Optimization',
    description: 'Techniques for optimizing React and Next.js applications',
    category: 'Frontend',
    author: 'Addy Osmani',
    x_account: '@addyosmani',
    content: `# Frontend Performance Optimization

## React Optimization
- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize images with next/image
- Minimize bundle size

## Next.js Optimization
- Use Server Components when possible
- Implement proper caching strategies
- Use ISR for static content
- Optimize API routes

## Asset Optimization
- Compress images (WebP format)
- Use font optimization
- Implement lazy loading
- Minimize CSS and JavaScript

## Monitoring
- Track Core Web Vitals
- Monitor bundle size
- Use performance profiling tools
- Implement error tracking`,
  },
  {
    name: 'Security Best Practices',
    description: 'Comprehensive security guidelines for web applications',
    category: 'Security',
    author: 'OWASP',
    x_account: '@owasp',
    content: `# Security Best Practices

## Authentication & Authorization
- Use secure authentication libraries (Clerk, Auth0)
- Implement proper session management
- Use JWT tokens securely
- Verify permissions server-side

## Input Validation
- Validate all user inputs with Zod
- Sanitize HTML content
- Use parameterized queries
- Implement CSRF protection

## API Security
- Implement rate limiting
- Use HTTPS in production
- Validate request headers
- Implement CORS properly

## Data Protection
- Never expose sensitive data in errors
- Use environment variables for secrets
- Encrypt sensitive data at rest
- Implement proper logging without secrets`,
  },
  {
    name: 'Testing Strategies',
    description: 'Comprehensive testing approaches for modern applications',
    category: 'Testing',
    author: 'Kent C. Dodds',
    x_account: '@kentcdodds',
    content: `# Testing Strategies

## Unit Testing
- Use Vitest for unit tests
- Test business logic thoroughly
- Mock external dependencies
- Aim for high coverage on critical paths

## Integration Testing
- Test API endpoints
- Test database interactions
- Use test databases
- Clean up after tests

## Component Testing
- Use React Testing Library
- Test user interactions
- Avoid testing implementation details
- Test accessibility

## E2E Testing
- Use Playwright for E2E tests
- Test critical user flows
- Run tests in CI/CD pipeline
- Keep tests maintainable`,
  },
  {
    name: 'DevOps & Deployment',
    description: 'Best practices for CI/CD and deployment workflows',
    category: 'DevOps',
    author: 'Vercel',
    x_account: '@vercel',
    content: `# DevOps & Deployment

## CI/CD Pipeline
- Run tests before deployment
- Use linting and type checking
- Build and test in CI
- Deploy only after all checks pass

## Environment Management
- Use environment variables
- Validate env vars at startup
- Use different configs for dev/staging/prod
- Never commit secrets

## Deployment
- Use Vercel for Next.js apps
- Implement blue-green deployments
- Monitor deployments
- Have rollback procedures

## Monitoring
- Set up error tracking
- Monitor application performance
- Track key metrics
- Set up alerts`,
  },
  {
    name: 'Code Quality & Maintainability',
    description: 'Guidelines for writing maintainable and scalable code',
    category: 'Best Practices',
    author: 'cursor.directory',
    x_account: '@cursordotdir',
    content: `# Code Quality & Maintainability

## Code Organization
- Follow consistent file structure
- Use meaningful variable names
- Keep functions small and focused
- Separate concerns properly

## Documentation
- Write clear comments for complex logic
- Document public APIs
- Keep README updated
- Use JSDoc for functions

## Code Review
- Review for security issues
- Check for performance problems
- Ensure tests are included
- Verify error handling

## Refactoring
- Refactor regularly
- Remove dead code
- Improve code gradually
- Maintain test coverage`,
  },
];

async function main() {
  console.log('🌱 Seeding industry leader rules...');

  for (const rule of industryLeaderRules) {
    try {
      await prisma.ruleTemplate.upsert({
        where: { name: rule.name },
        update: {
          description: rule.description,
          content: rule.content,
          category: rule.category,
          author: rule.author,
          x_account: rule.x_account,
        },
        create: rule,
      });
      console.log(`✅ Seeded: ${rule.name}`);
    } catch (error) {
      console.error(`❌ Error seeding ${rule.name}:`, error);
    }
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

