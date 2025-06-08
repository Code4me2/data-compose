# Contributing to n8n-nodes-haystack

First off, thank you for considering contributing to n8n-nodes-haystack! It's people like you that make this project such a great tool for the legal tech community.

## Code of Conduct

By participating in this project, you are expected to uphold our values of being respectful, inclusive, and professional. Please report unacceptable behavior to support@judicial-access.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include logs and error messages**
* **Include your environment details** (OS, Docker version, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Provide specific examples to demonstrate the enhancement**
* **Describe the current behavior and explain the improved behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue that pull request!

## Development Process

### Setting Up Your Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/n8n-nodes-haystack.git
   cd n8n-nodes-haystack/n8n
   ```

2. **Install dependencies**
   ```bash
   # For the n8n node
   cd custom-nodes/n8n-nodes-haystack
   npm install
   
   # For the Python service (optional, for local development)
   cd ../../haystack-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements-minimal.txt
   ```

3. **Start development environment**
   ```bash
   ./start_haystack_quick.sh
   ```

### Code Style Guidelines

#### TypeScript (n8n Node)

* Use TypeScript for all new code
* Follow the existing code style
* Use meaningful variable and function names
* Add JSDoc comments for public functions
* Run `npm run lint` before committing

Example:
```typescript
/**
 * Searches documents using the specified method
 * @param query - The search query string
 * @param options - Search configuration options
 * @returns Array of matching documents
 */
async function searchDocuments(
  query: string,
  options: SearchOptions
): Promise<Document[]> {
  // Implementation
}
```

#### Python (Haystack Service)

* Follow PEP 8 style guide
* Use type hints for function parameters and returns
* Add docstrings for all functions and classes
* Keep functions focused and single-purpose

Example:
```python
def search_documents(
    query: str,
    top_k: int = 10,
    search_type: str = "hybrid"
) -> List[Dict[str, Any]]:
    """
    Search documents using the specified method.
    
    Args:
        query: The search query string
        top_k: Number of results to return
        search_type: Type of search (hybrid, vector, bm25)
        
    Returns:
        List of matching documents with scores
    """
    # Implementation
```

### Testing

#### Running Tests

```bash
# TypeScript tests
cd custom-nodes/n8n-nodes-haystack
npm test

# Python integration tests
cd haystack-service
python test_integration.py
```

#### Writing Tests

* Write tests for all new functionality
* Ensure tests are deterministic and don't depend on external services
* Use descriptive test names that explain what is being tested
* Include both positive and negative test cases

### Documentation

* Update the README.md if you change functionality
* Add inline documentation for complex logic
* Update API documentation for endpoint changes
* Include examples for new features

### Commit Guidelines

We use conventional commits. Each commit message should be structured as follows:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that don't affect code meaning
* **refactor**: Code change that neither fixes a bug nor adds a feature
* **perf**: Performance improvement
* **test**: Adding missing tests
* **chore**: Changes to build process or auxiliary tools

Example:
```
feat(search): add filter support to hybrid search

- Add filters parameter to search endpoint
- Support filtering by document_type and metadata fields
- Update tests to cover filter functionality

Closes #123
```

## Project Structure

Understanding the project structure will help you navigate and contribute effectively:

```
n8n/
├── custom-nodes/           # n8n custom node implementation
│   └── n8n-nodes-haystack/
│       ├── nodes/          # Node source files
│       ├── credentials/    # Authentication (if needed)
│       └── dist/           # Compiled output
├── haystack-service/       # Python FastAPI service
│   ├── haystack_service_simple.py  # Main service
│   ├── elasticsearch_setup.py      # Index configuration
│   └── test_integration.py         # Tests
└── docker-compose.haystack.yml     # Service orchestration
```

## Review Process

### What We Look For

* **Code quality**: Is the code clean, readable, and maintainable?
* **Testing**: Are there adequate tests?
* **Documentation**: Is the feature/fix documented?
* **Performance**: Does it introduce performance regressions?
* **Security**: Does it follow security best practices?

### Review Timeline

We aim to review pull requests within 3-5 business days. Larger changes may take longer.

## Release Process

1. We use semantic versioning (MAJOR.MINOR.PATCH)
2. Releases are created from the `main` branch
3. Each release includes:
   - Updated CHANGELOG.md
   - Tagged version in git
   - GitHub release with notes
   - npm package publication (if applicable)

## Questions?

Feel free to:
* Open an issue for questions
* Start a discussion in GitHub Discussions
* Contact the maintainers at support@judicial-access.com

## Recognition

Contributors will be recognized in:
* The project README
* Release notes for their contributions
* Our project website (when available)

Thank you for contributing to n8n-nodes-haystack! 🎉