# Hierarchical Summarization PostgreSQL Integration Analysis

## Current Docker Setup

### PostgreSQL Container
- **Container Name**: `data-compose-db-1`
- **Image**: `postgres:latest`
- **Port**: 5432 (internal only, not exposed to host)
- **Network**: backend
- **Database Credentials** (from .env):
  - User: `your_db_user`
  - Password: `your_secure_password_here`
  - Database: `your_db_name`

### Database Location
The PostgreSQL database is controlled by the main `docker-compose.yml` file in the root directory of the data-compose project. It's defined as a service named `db` and uses a Docker volume `postgres_data` for persistent storage.

## Hierarchical Summarization Node Database Requirements

The custom n8n node expects PostgreSQL with the following schema:

### Tables Required
1. **hierarchical_documents**
   - Stores document content and summaries
   - Tracks hierarchy relationships (parent_id, child_ids)
   - Includes metadata, token counts, and timestamps
   
2. **processing_status**
   - Tracks batch processing progress
   - Stores current level, document counts, and status

### Database Connection Options
The node supports three connection methods:

1. **Connected Database** (default)
   - Uses a database connection from another n8n node
   - Expects database connection as second input
   
2. **Credentials**
   - Uses PostgreSQL credentials configured in n8n
   - Requires postgres credentials to be set up in n8n
   
3. **Manual Configuration**
   - Direct configuration via node parameters
   - Host, port, database, user, password

## Integration Approach

### Option 1: Use Existing PostgreSQL Container (Recommended)
Since there's already a PostgreSQL container running (`data-compose-db-1`), the hierarchical summarization node can connect to it using:

**For Manual Configuration:**
- Host: `db` (Docker service name, accessible within the backend network)
- Port: `5432`
- Database: `your_db_name`
- User: `your_db_user`
- Password: `your_secure_password_here`

**For n8n Credentials:**
Create PostgreSQL credentials in n8n with the same values.

### Option 2: Use n8n's Database Connection Node
1. Add a PostgreSQL node to the n8n workflow
2. Configure it with the database credentials
3. Connect it to the Hierarchical Summarization node's "Database Connection" input

## Implementation Steps

### 1. Schema Creation
The node automatically creates required tables when using credentials or manual configuration. For connected databases, the schema should be pre-configured.

### 2. Network Configuration
Both n8n and PostgreSQL containers are on the `backend` network, allowing direct communication using the service name `db`.

### 3. Connection from n8n Node
Inside the n8n container, the PostgreSQL database can be accessed at:
- **Host**: `db` (not `localhost` or `data-compose-db-1`)
- **Port**: `5432`

## Security Considerations

1. The PostgreSQL container is not exposed to the host, only accessible within the Docker network
2. Credentials are stored in environment variables via .env file
3. The node supports secure credential storage through n8n's credential system

## Testing Connection

To test if the hierarchical summarization node can connect to the database:

1. In n8n, create a new workflow
2. Add the Hierarchical Summarization node
3. Configure Database Configuration as "Manual Configuration"
4. Use these settings:
   - Database Host: `db`
   - Database Name: `your_db_name`
   - Database User: `your_db_user`
   - Database Password: `your_secure_password_here`
   - Database Port: `5432`

## Notes on Current Database State

- The database currently has no tables (empty schema)
- The hierarchical summarization node will create required tables on first use
- The schema includes proper indexes for performance
- Foreign key constraints ensure data integrity

## Recommended Next Steps

1. Update the `.env` file with actual secure credentials (not placeholder values)
2. Test the connection from n8n to PostgreSQL using the manual configuration
3. Consider creating n8n PostgreSQL credentials for easier reuse across workflows
4. Monitor the `hierarchical_documents` and `processing_status` tables after first use

## Alternative Approaches

If isolation is needed, consider:
1. Creating a separate database within the same PostgreSQL instance
2. Using a dedicated PostgreSQL container for hierarchical summarization
3. Implementing connection pooling for better performance with multiple workflows