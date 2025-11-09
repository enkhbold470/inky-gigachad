# Inky - Memory Layer for Personalized Coding

**Inky** is a personalized coding memory layer that helps developers maintain consistent coding styles and preferences across different IDEs and CLI tools. It analyzes your GitHub repositories, markdown documentation, and coding patterns to generate personalized coding rules that can be integrated with AI coding assistants.

## 🎯 Overview

Inky creates a "memory layer" for your coding preferences by:
- Analyzing your GitHub repositories to understand your coding patterns
- Processing markdown documentation files to extract coding guidelines
- Generating personalized coding rules using AI
- Storing rules in a vector database for semantic search
- Providing an MCP (Model Context Protocol) server interface for integration with coding tools

## ✨ Key Features

### 1. **Repository Analysis**
- Connect your GitHub account via OAuth
- Select repositories to analyze
- Extract coding patterns, languages, and preferences
- Support for both personal and organization repositories

### 2. **Intelligent Rule Generation**
- **Multistep Progress Tracking**: Visual progress dialog showing:
  - Markdown file discovery
  - Repository saving
  - File processing
  - AI rule generation
  - Linux command visualization
- **AI-Powered Analysis**: Uses OpenAI GPT-4 to generate comprehensive coding rules
- **Markdown Context Integration**: Analyzes project markdown files for additional context

### 3. **Rule Management**
- Create, update, and delete coding rules
- Version control for rules (track changes over time)
- Rule templates from industry leaders
- Vector search using Pinecone for semantic rule matching
- Rule relevance scoring for coding sessions

### 4. **Coding Sessions**
- Track coding sessions with context
- Automatically match relevant rules to sessions
- Session history and analytics
- Active session management

### 5. **MCP Server Integration**
- Model Context Protocol server for tool integration
- Compatible with Windsurf, Cursor, Claude Code, and CodeX
- RESTful API for rule access

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner

### Backend
- **Runtime**: Next.js Server Actions
- **Authentication**: Clerk
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma
- **Vector Database**: Pinecone
- **AI/ML**: OpenAI (GPT-4, text-embedding-3-small)

### Infrastructure
- **Package Manager**: pnpm
- **Deployment**: Vercel (recommended)
- **Environment**: Node.js

## 📁 Project Structure

```
inky-gigachad/
├── app/                          # Next.js app directory
│   ├── actions/                  # Server actions
│   │   ├── repo_actions.ts       # Repository management
│   │   ├── rule_actions.ts       # Rule CRUD operations
│   │   ├── session_actions.ts    # Coding session management
│   │   ├── template_actions.ts   # Rule templates
│   │   └── random.ts             # GitHub repo fetching
│   ├── page.tsx                  # Main dashboard
│   ├── layout.tsx                # Root layout
│   ├── sign-in/                  # Authentication pages
│   └── sign-up/
├── components/                   # React components
│   ├── ui/                       # Shadcn UI components
│   └── header.tsx                # App header
├── lib/                          # Utility libraries
│   ├── prisma.ts                 # Prisma client
│   ├── github.ts                 # GitHub API integration
│   ├── pinecone.ts               # Pinecone client
│   ├── embeddings.ts             # OpenAI embeddings
│   ├── markdown-context.ts       # Markdown file processing
│   ├── validations.ts            # Zod schemas
│   └── types.ts                  # TypeScript types
├── prisma/                       # Database schema
│   └── schema.prisma             # Prisma schema
├── docs/                         # Documentation
│   ├── multistep-rule-generation.md
│   ├── llms-full-nextjs.md
│   └── pinecone.md
├── emergent/                     # Rule templates
│   └── rules/                    # MDC rule files
└── public/                       # Static assets
```

## 🗄️ Database Schema

### Core Models

- **User**: User accounts linked to Clerk authentication
- **Repository**: GitHub repositories connected to users
- **Rule**: Personalized coding rules with versioning support
- **RuleTemplate**: Public rule templates from industry leaders
- **CodingSession**: Tracks coding sessions with context
- **CodingSessionRule**: Links rules to sessions with relevance scores

### Key Features
- Version control for rules (parent_rule_id)
- Vector search integration (pinecone_id)
- Soft deletes and active/inactive states
- Cascade deletions for data integrity

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm (package manager)
- PostgreSQL database (Neon recommended)
- Clerk account (for authentication)
- Pinecone account (for vector search)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inky-gigachad
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://..."

   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
   CLERK_SECRET_KEY="sk_..."

   # Vector Database
   PINECONE_API_KEY="..."
   PINECONE_INDEX="inky-rules"

   # AI
   OPENAI_API_KEY="sk-..."

   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Clerk Authentication Setup

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure GitHub OAuth provider
4. Add your environment variables

### Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create a new index:
   - Name: `inky-rules`
   - Dimensions: `1536` (for text-embedding-3-small)
   - Metric: `cosine`
3. Copy your API key to `.env`

### OpenAI Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env` as `OPENAI_API_KEY`

## 📖 Usage

### 1. Initial Setup

1. **Sign In**: Authenticate with Clerk and connect GitHub
2. **Select Repositories**: Choose repositories to analyze
3. **Generate Rules**: Let Inky analyze and generate coding rules
4. **Select Templates**: Choose from industry leader templates
5. **Connect Tool**: Copy MCP server configuration for your IDE

### 2. Rule Management

- **Create Rules**: Automatically generated from repositories or manually created
- **Update Rules**: Creates new versions while preserving history
- **Search Rules**: Semantic search using vector similarity
- **Delete Rules**: Remove rules you no longer need

### 3. Coding Sessions

- Start a new coding session with context
- Relevant rules are automatically matched
- Track session progress and history
- End sessions when complete

## 🔌 MCP Server Integration

Inky provides an MCP (Model Context Protocol) server for integration with AI coding tools.

### Configuration Example

```json
{
  "mcpServers": {
    "inky-rules": {
      "type": "http",
      "url": "https://api.inky.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### Supported Tools
- Windsurf
- Cursor
- Claude Code
- CodeX

## 🏗️ Architecture

### Design Patterns

- **Repository Pattern**: Data access abstraction
- **Server Actions**: Next.js server-side mutations
- **Service Layer**: Business logic separation
- **Type Safety**: Full TypeScript coverage

### Code Style Guidelines

- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns
- Always edit `global.css` for styles (no inline Tailwind)
- Follow repository pattern for data access

## 📚 Documentation

- [Multistep Rule Generation](./docs/multistep-rule-generation.md) - Detailed guide on rule generation process
- [Pinecone Integration](./docs/pinecone.md) - Vector database setup and usage
- [LLMs Integration](./docs/llms-full-nextjs.md) - AI/LLM integration guide

## 🧪 Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (if configured)
- Follow existing patterns and conventions

### Database Migrations

```bash
# Generate Prisma client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy
```

### Linting

```bash
pnpm lint
```

## 🔒 Security

- Authentication via Clerk
- Server-side validation with Zod
- Environment variable protection
- SQL injection prevention (Prisma)
- XSS protection (React)

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Ensure all required environment variables are set in your deployment platform.

## 🤝 Contributing

1. Follow the code style guidelines
2. Use TypeScript for all new code
3. Write meaningful commit messages
4. Test your changes thoroughly
5. Update documentation as needed

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- Built with Next.js, React, and TypeScript
- UI components from Shadcn UI
- Authentication by Clerk
- Vector search powered by Pinecone
- AI capabilities from OpenAI

## 📧 Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Inky** - Your coding memory, everywhere you code. 🚀
