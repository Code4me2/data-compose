#!/bin/sh
# Court Processor Entrypoint Script

# Start cron in background
cron

# Run initial test to verify setup
echo "Court Processor Container Started"
echo "Python version: $(python3 --version)"
echo "Database URL configured: ${DATABASE_URL:+Yes}"

# Keep container running
tail -f /dev/null