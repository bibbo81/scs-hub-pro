# Contributor Guidelines

## Code Style
- Use **4 spaces** for indentation.
- Always end JavaScript statements with a semicolon.
- Prefer `const` and `let` over `var`.
- Keep lines under **120 characters**.
- Use arrow functions where appropriate.
- Document public functions with inline comments.

## Testing
- Run tests with `npm test` before every commit.
- Use Node.js **v18** for running the project and tests.
- If dependencies are missing, run `npm install` first.
- Fix any failing tests before opening a pull request.

## Commit Messages
- Follow the format `type: short description` (e.g. `feat: add search module`).
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- Keep messages concise and in the imperative mood.
- Group related changes into a single commit.
