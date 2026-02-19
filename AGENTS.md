# AGENTS.md

MANDATORY FOR ALL TASKS: Read the following files if they are not already in the context window:

- README.md
- docs/architecture.md
- docs/state-management.md

## Project Overview

Refer to README.md for an overview of the project and for instructions for doing common development tasks.

Refer to docs/architecture.md for an overview of the architecture of the project.

## Writing Code in the Project

Please follow the following guidelines when changing or adding code to the project:

- Read README.md and docs/architecture.md before starting work on a new feature or bugfix.
- Maintain the architecture specified in docs/architecture.md. If changing the architecture after mutual agreement, please update docs/architecture.md accordingly.
- Follow the existing coding style and conventions used in the project.
- Use Typescript best practices according to standard eslint rules and format code according to prettier style.
- Always check that code you have written is free of linting and type-checking errors. Use the commands specified in README.md to check this.

### Tests

- Write and/or maintain unit tests for code you add or change. Unit test quantity should be balanced; cover the most critical logic and edge cases without writing so many tests as to create a maintenance burden. Tests for React components should use React Testing Library to drive tests from a user perspective.
- Avoid writing tests that are coupled to implementation; write code that has a clear contract of behavior and write tests that verify that behavior. For React components, use React Testing Library to accomplish this.
  - In particular, avoid writing tests which assert on the presence or value of classes. For example, do not assert on the presence of a Tailwind class to verify that an element has a certain style.
- Work should not be considered done until tests that cover the work in question are passing.
- Some code duplication in tests is expected, but factor out common setup logic where it makes sense to do so and where it can make tests less verbose and easier to read.

### Comments

- Write clear and concise comments to explain complex logic or decisions in the code.
- Avoid writing comments that are redundant or obvious from the code itself.
- Avoid ALL-CAPS declarations in comments unless you truly think something needs to be highly emphasized to the reader.
- When writing comments, consider the perspective of a person reading the code for the first time. Avoid the temptation to write comments based on the context of a current debugging session or recent change that might not be relevant to future readers.
