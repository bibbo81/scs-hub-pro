# AGENTS

This repository contains HTML, JavaScript, Netlify functions, and Supabase edge functions.

## Contributing Guidelines
- Use **two spaces** for indentation in JavaScript, TypeScript and JSON files.
- Terminate JavaScript/TypeScript statements with semicolons.
- Keep classes in `PascalCase` and functions/variables in `camelCase`.
- Update `package.json` when adding dependencies.
- Keep commit messages concise using present tense. Example: `fix(parser): handle null headers`.

## Testing
There are no automated tests. Perform manual testing by serving the HTML files locally:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000/tracking.html` in the browser. If future tests are added, run `npm test`.

## Tools
- Netlify functions are under `netlify/functions/`.
- Supabase edge functions are under `supabase/functions/` and formatted with `deno fmt`.

