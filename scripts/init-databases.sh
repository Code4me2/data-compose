#!/bin/bash
set -e

# This script is run by PostgreSQL during initialization
# It creates the legal_chat database if it doesn't exist

# Create legal_chat database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- Create the legal_chat database if it doesn't exist
    SELECT 'CREATE DATABASE legal_chat'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'legal_chat')\\gexec
    
    -- Grant all privileges on the legal_chat database to the main user
    GRANT ALL PRIVILEGES ON DATABASE legal_chat TO "$POSTGRES_USER";
EOSQL

echo "Database initialization complete"