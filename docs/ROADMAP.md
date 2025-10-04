# Roadmap

This document outlines the future plans for the Job Finder project.

## Up Next

- **Add macOS and Linux support**: Currently Windows-only. We plan to add native installers for macOS and Linux.
- **Bring the Cloud Run bootstrapper experience to AWS and Azure**: The current cloud deployment is focused on GCP. We plan to add support for AWS Lambda and Azure Functions.
- **Improve the Windows setup script**: Continue to refine the Windows installer to make it even more user-friendly.
- **Expand CI to cover more scraping edge cases**: Add more tests to the CI/CD pipeline to cover a wider range of scraping scenarios.

## Future Enhancements

- **Smarter AI helpers**: Use large language models (LLMs) to provide resume hints, explanations for job matches, and other AI-powered features.
- **More scrapers**: Add support for more job boards and company career pages.
- **Lightweight mobile or web notifications**: Provide a way to receive job notifications on mobile devices or in a web browser.
- **Better privacy tooling**: Add features for exporting user data and reminding users to rotate their API keys.
- **Full encryption of data in transit and at rest**: Encrypt all data, both in transit and at rest, to further improve security.

## Technical Debt and Refactoring

- **Add comprehensive unit and integration tests**: The current test suite is limited. We plan to add more tests to improve code coverage and ensure the reliability of the application.
- **Improve type hint coverage**: The current type hint coverage is around 60%. We plan to increase this to improve code quality and catch more errors at development time.
- **Refactor large functions**: Some functions in the codebase are too large and complex. We plan to refactor these into smaller, more manageable functions.
- **Add docstrings to all public functions**: Add docstrings to all public functions to improve the documentation and make the code easier to understand.
