# Fix: Use PostgreSQL Credentials Instead of Connected Database

## The Problem
The "Use Connected Database" option in the Hierarchical Summarization node expects a database connection object, but PostgreSQL nodes output query results, not connection objects. This is why the connection doesn't work properly.

## The Solution: Use Credentials
Since you've already successfully created PostgreSQL credentials in n8n, this is the best approach:

### Step 1: Remove the PostgreSQL Node
You don't need the PostgreSQL node in your workflow. Remove it.

### Step 2: Configure Hierarchical Summarization Node
1. Add only the **Hierarchical Summarization** node
2. Set **Database Configuration** to **"Use Credentials"**
3. Select the PostgreSQL credentials you created earlier
4. Configure your other settings:
   - Summary Prompt
   - Context Prompt
   - Content Source
   - Batch Size

### Step 3: Connect Only the AI Model
Your workflow now only needs:
```
[AI Language Model Node] ──────> [Hierarchical Summarization Node]
                                 (Language Model input)
```

## Why This Works Better
1. **Simpler**: No need for a separate PostgreSQL node
2. **More Secure**: Credentials are managed by n8n's credential system
3. **Proper Design**: This is how n8n nodes are meant to handle database connections
4. **Already Tested**: You've confirmed the credentials work

## Alternative: Use Manual Configuration
If you prefer not to use credentials, you can also select **"Manual Configuration"** and enter:
- Host: `db`
- Database: `your_db_name`
- User: `your_db_user`
- Password: `your_secure_password_here`
- Port: `5432`

## Note on the Code
The "Use Connected Database" option in the node (lines 276-294) attempts to read database connection data from the input, but this approach is incompatible with how n8n database nodes actually work. The credentials approach (lines 299-310) is the proper implementation.