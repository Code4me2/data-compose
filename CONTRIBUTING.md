# Contributing to Data-Compose

Thank you for your interest in contributing to Data-Compose! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Push to your fork and submit a pull request

## Development Setup

1. Follow the setup instructions in [README.md](README.md)
2. Ensure Docker and Docker Compose are installed
3. Copy `.env.example` to `.env` and configure as needed
4. Run `docker-compose up -d` to start all services

## Code Style

### JavaScript/TypeScript
- Use ESLint and Prettier (configurations provided)
- Follow the existing code patterns
- Add JSDoc comments for public functions
- Use TypeScript where possible

### Python
- Follow PEP 8
- Use type hints
- Add docstrings to functions and classes

### General
- Keep functions small and focused
- Write descriptive variable and function names
- Comment complex logic
- Avoid code duplication

## Testing

- Test your changes locally before submitting
- For n8n custom nodes, use the test scripts in each node's directory
- Verify Docker services start correctly
- Check logs for errors: `docker-compose logs -f`

## Pull Request Process

1. Update documentation for any new features
2. Ensure all tests pass
3. Update the README.md if needed
4. Reference any related issues in your PR description
5. Request review from maintainers

## Commit Messages

Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code restructuring
- `test:` Test additions/changes

Example: `feat: Add batch processing to Haystack node`

## Areas for Contribution

### High Priority
- Windows compatibility for Ollama integration
- Production deployment guides
- Additional n8n custom nodes
- Test coverage improvements

### Feature Ideas
- Additional AI model integrations
- Enhanced visualization capabilities
- Performance optimizations
- Security enhancements

## Questions?

- Open an issue for bugs or feature requests
- Use discussions for general questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.