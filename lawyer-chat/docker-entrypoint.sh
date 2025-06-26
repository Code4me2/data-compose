#!/bin/sh
set -e

echo "Starting Lawyer Chat application..."

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || {
  echo "Migration failed, database might not exist yet. Creating database..."
  # The database should be created by the init script, but we'll handle errors gracefully
  echo "Proceeding with application startup..."
}

# Start the application
echo "Starting Next.js application..."
exec npm start