#!/bin/sh
# postinstall.sh - Prisma generate script that handles build environments

if [ -f "./prisma/schema.prisma" ]; then
  echo "Generating Prisma Client..."
  prisma generate --schema=./prisma/schema.prisma
else
  echo "Prisma schema not found at ./prisma/schema.prisma, skipping generate"
  echo "This is normal in some build environments where schema is generated separately"
fi

