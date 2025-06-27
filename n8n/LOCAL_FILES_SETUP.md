# Local Files Directory Setup for Hierarchical Summarization

## Overview

The `local-files/` directory is mounted inside the n8n container at `/files` and is used for processing directories of text documents.

## Directory Structure

```
n8n/local-files/
└── uploads/          # Place directories of .txt files here
    └── [batch-name]/ # Each batch in its own directory
        ├── document1.txt
        ├── document2.txt
        └── ...
```

## Initial Setup Required

The `local-files/` directory is created by Docker and owned by root. You need to set it up for use:

```bash
# From the data-compose root directory
sudo mkdir -p n8n/local-files/uploads
sudo chmod 777 n8n/local-files/uploads

# Alternative: Change ownership to your user
sudo chown -R $USER:$USER n8n/local-files
mkdir -p n8n/local-files/uploads
```

## Using with Hierarchical Summarization

1. **Prepare your documents**: Place a directory of .txt files in `n8n/local-files/uploads/[batch-name]/`

2. **In the web interface**:
   - Navigate to the "Recursive Summary" tab
   - Enter your batch directory name (e.g., "legal-docs-2024")
   - Click "Start Hierarchical Summarization"

3. **The system will**:
   - Send the directory path to n8n via webhook
   - The Hierarchical Summarization node reads from `/files/uploads/[batch-name]/`
   - Process all .txt files through the AI summarization pipeline
   - Return the final hierarchical summary

## Example

```bash
# Place documents
cp -r ~/my-documents/legal-case-files/ n8n/local-files/uploads/case-2024-001/

# In web interface, enter: case-2024-001
# Full path used by n8n: /files/uploads/case-2024-001/
```