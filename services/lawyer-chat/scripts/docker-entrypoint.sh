#!/bin/sh

echo "Waiting for database to be ready..."
until npx prisma db push --skip-generate; do
  echo "Database is unavailable - sleeping"
  sleep 5
done

echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "No migrations to deploy"

# Start the application
echo "Starting Next.js application..."
exec node server.js