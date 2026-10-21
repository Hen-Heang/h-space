# Security rule

- Treat request input, file paths, database identifiers, and external responses as untrusted.
- Use the project's existing authentication and authorization boundaries.
- Do not read secret files or copy secret values into logs, prompts, context, or code.
- Use parameterized database access and preserve ownership predicates.
- Flag a security concern with its file and consequence; do not silently weaken a guard.
