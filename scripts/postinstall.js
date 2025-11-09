// scripts/postinstall.js
// Cross-platform postinstall script for Prisma generation

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

if (fs.existsSync(schemaPath)) {
  try {
    console.log('Generating Prisma Client...');
    execSync('prisma generate --schema=./prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Prisma Client generated successfully');
  } catch (error) {
    console.warn('⚠️ Failed to generate Prisma Client:', error.message);
    console.log('Continuing build...');
    process.exit(0); // Don't fail the build
  }
} else {
  console.log('ℹ️ Prisma schema not found at prisma/schema.prisma');
  console.log('Skipping Prisma Client generation (this is normal in some build environments)');
}

