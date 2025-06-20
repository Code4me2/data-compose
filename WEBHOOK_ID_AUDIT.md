# Webhook ID Audit Report

## Summary
All webhook IDs in the codebase have been verified and documentation has been updated for consistency.

## Webhook ID in Use
**`c188c31c-1c45-4118-9ece-5b6057ab5177`**

## Locations Verified

### ✅ Implementation Files (Correct)
- `/website/js/config.js` - Frontend configuration
- `/workflow_json/web_UI_basic` - n8n workflow (both path and webhookId fields)
- `/workflow_json/hierarchical_summarization_workflow.json` - Hierarchical summarization workflow
- `/CLAUDE.md` - Internal documentation

### ✅ Documentation Files (Now Fixed)
- `/README.md` - Updated from placeholder text to actual webhook ID

## Changes Made
1. Updated README.md line 79: Changed example curl URL to use actual webhook ID
2. Updated README.md lines 483-484: Changed config.js example to show actual webhook ID

## Notes
- The webhook ID is not sensitive information as it's already exposed in workflow export files
- This ID must remain consistent across all files for the system to work properly
- Users following the README will now have the correct webhook ID for testing