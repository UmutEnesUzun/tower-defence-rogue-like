# Contributing to Tower Defence Rogue-like

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or hateful conduct
- Constructive feedback only
- Respect intellectual property

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Provide detailed reproduction steps
3. Include browser and OS information
4. Describe expected vs actual behavior
5. Include screenshots if applicable

### Suggesting Enhancements

1. Use the feature request template
2. Explain the use case
3. Provide examples if possible
4. Consider compatibility with existing features

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m "Add feature: description"`
6. Push to your fork
7. Create a pull request

### Pull Request Process

1. Update documentation as needed
2. Add tests if applicable
3. Ensure code follows existing style
4. Link related issues
5. Provide clear description of changes
6. Be open to feedback

## Development Setup

```bash
# Clone repository
git clone https://github.com/UmutEnesUzun/tower-defence-rogue-like.git
cd tower-defence-rogue-like

# Start local server
python -m http.server 8000
# or
npx http-server