# Rules for AI Assistants

## Standard Development Workflow

1. **Read design docs first**: Check `docs/design/<component>.md` before modifying components

2. **Update docs**: Sync README/design docs when changes impact them

3. **No extra markdown**: DO NOT create additional markdown files in the repository unless you are instructed explicitly to.

4. **Atomic commits**: You MUST commit as you make changes, grouped by single logical purpose (≤150 lines code + ≤150 lines tests). Break larger changes into multiple commits

5. **Commit format**:
   ```
   Single sentence summary
   
   Explanation (few paragraphs max).
   
   ---
   Prompt: <user's original prompt>
   ```
   - Word wrap at 72 columns
   - Attribute commits to user, not AI assistant

6. **Test scope**: Write focused tests, avoid testing multiple functions together

7. **CRITICAL**: You MUST learn skills before using operational tools. Skills are in `docs/skills/` with descriptive filenames. DO NOT create new skills unless explicitly requested by the user.

**Available skills:**
- Use `docs/skills/deployment.md` for deployments
- Use `docs/skills/logging.md` for log analysis
- Use `docs/skills/secret-management.md` for managing secrets
- Use `docs/skills/database.md` for database operations

## Security Standards

1. **Never commit secrets**: API keys, passwords, tokens, or sensitive data MUST use environment variables or AWS Secrets Manager. Use `.gitignore` to exclude config files with credentials.

2. **Security review required**: Changes involving authentication, authorization, data handling, or external integrations MUST include security considerations in commit messages.

3. **Input validation**: Always implement input validation and sanitization for user-provided data. Never trust client-side validation alone.

4. **Least privilege**: When creating IAM roles or permissions, grant only minimum necessary access. Document why each permission is needed.

5. **Dependency security**: Before adding dependencies, verify they are actively maintained and free of known vulnerabilities.

**ALWAYS FOLLOW THESE RULES WHEN YOU WORK IN THIS PROJECT**

