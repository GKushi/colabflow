#!/bin/sh

echo "🚀 Running Prisma migration..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ Migration failed. Exiting."
  exit 1
fi

echo "✅ Migration complete. Starting app..."
node dist/main

