# How to Connect Hierarchical Summarization Node to PostgreSQL

## Current Setup Clarification

You have:
1. **PostgreSQL container** (`data-compose-db-1`) running as part of your Docker setup
2. **n8n container** (`data-compose-n8n-1`) with custom nodes
3. **Hierarchical Summarization custom node** that needs database access

## Connection Methods

The Hierarchical Summarization node offers **3 ways** to connect to PostgreSQL:

### Method 1: Manual Configuration (Simplest)
This is the easiest way to get started:

1. In your n8n workflow, add the **Hierarchical Summarization** node
2. In the node settings, find **Database Configuration**
3. Select **"Manual Configuration"**
4. Enter these values:
   - **Database Host**: `db` (this is the Docker service name)
   - **Database Name**: `your_db_name`
   - **Database User**: `your_db_user`
   - **Database Password**: `your_secure_password_here`
   - **Database Port**: `5432`

**Important**: Use `db` as the host, NOT `localhost` or `data-compose-db-1`. This is because within Docker, services communicate using their service names.

### Method 2: Using n8n PostgreSQL Node (Most Flexible)
Yes, n8n DOES have a built-in PostgreSQL node! Here's how to use it:

1. In your n8n workflow, add a **PostgreSQL** node (search for "Postgres" in the node panel)
2. Configure the PostgreSQL node:
   - Create new credentials or use existing ones
   - **Host**: `db`
   - **Database**: `your_db_name`
   - **User**: `your_db_user`
   - **Password**: `your_secure_password_here`
   - **Port**: `5432`
3. Connect the PostgreSQL node output to the **Hierarchical Summarization** node's "Database Connection" input
4. In Hierarchical Summarization settings, set **Database Configuration** to **"Use Connected Database"**

### Method 3: Using n8n Credentials (Most Reusable)
This stores credentials securely in n8n:

1. In n8n, go to **Settings** → **Credentials**
2. Click **Add New** → Search for **"Postgres"**
3. Fill in:
   - **Host**: `db`
   - **Database**: `your_db_name`
   - **User**: `your_db_user`
   - **Password**: `your_secure_password_here`
   - **Port**: `5432`
4. Save the credentials
5. In your Hierarchical Summarization node:
   - Set **Database Configuration** to **"Use Credentials"**
   - Select the PostgreSQL credentials you just created

## Visual Workflow Example

For Method 2 (using PostgreSQL node), your workflow would look like:

```
[PostgreSQL Node] ──────> [Hierarchical Summarization Node]
                         (Database Connection input)
                         
[AI Model Node] ────────> [Hierarchical Summarization Node]
                         (Language Model input)
```

## Testing the Connection

To verify the connection works:

1. Create a simple test workflow
2. Add just the Hierarchical Summarization node
3. Use Method 1 (Manual Configuration) for quick testing
4. Set a test directory path with some .txt files
5. Execute the workflow

If successful, the node will:
- Connect to PostgreSQL
- Create the required tables (`hierarchical_documents` and `processing_status`)
- Process your documents

## Troubleshooting

If connection fails:

1. **Check container names are correct**:
   ```bash
   docker ps
   ```

2. **Verify both containers are on same network**:
   ```bash
   docker network inspect data-compose_backend
   ```

3. **Test connection from n8n container**:
   ```bash
   docker exec -it data-compose-n8n-1 sh
   # Inside container:
   nc -zv db 5432
   ```

4. **Check PostgreSQL logs**:
   ```bash
   docker logs data-compose-db-1
   ```

## Important Notes

- The PostgreSQL container is NOT directly exposed to your host machine (no port mapping)
- Containers communicate through the Docker `backend` network
- The hostname `db` only works from within Docker containers on the same network
- The Hierarchical Summarization node will automatically create required database tables on first use