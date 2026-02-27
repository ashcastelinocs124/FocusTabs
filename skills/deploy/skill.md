# Deploy Skill
**Description:** Production deployment with pre-flight checks, staged rollout, and post-deploy verification. Follows industry best practices for zero-downtime deploys.
**Usage:** /deploy [target: railway|vercel|manual] [--skip-tests] [--dry-run]

**Trigger this skill when:**
- User says "deploy", "ship it", "push to production", "go live"
- User asks to deploy to Railway, Vercel, AWS, or any hosting platform
- User wants to release a new version
- User asks to update the production environment

**Skip for:** Local development setup, staging environments (unless explicitly requested), CI/CD pipeline configuration (use /code-implementation)

---

## Pre-Flight Checklist (BLOCKING)

Before ANY deployment, complete every item. A single failure = stop and fix.

### 1. Code Quality Gate

```
[ ] All files compile/parse without errors
    - Python: python -m py_compile <file>
    - JS in HTML: extract JS → node --check
    - Django: python manage.py check
[ ] No hardcoded secrets (grep for sk-, api_key=", password=", token=")
[ ] No debug flags left on (DEBUG=True, console.log debugging, breakpoints)
[ ] .gitignore covers: .env, *.sqlite3, __pycache__/, node_modules/, .claude/
```

### 2. Test Gate

```
[ ] Unit tests pass: python manage.py test (or pytest)
[ ] Integration tests pass (if available)
[ ] Manual smoke test on localhost confirms core flows work
[ ] No test files contain hardcoded secrets or real API keys
```

### 3. Dependency Gate

```
[ ] requirements.txt (or package.json) is up to date
[ ] No unused dependencies
[ ] No known vulnerable dependencies (pip-audit / npm audit)
[ ] Lock files committed if applicable (package-lock.json, poetry.lock)
```

### 4. Database Gate

```
[ ] Migrations are generated and committed
[ ] Migrations are backward-compatible (no destructive schema changes without plan)
[ ] Migration can run on production data volume without timeout
[ ] Rollback migration exists for risky changes
```

### 5. Configuration Gate

```
[ ] Environment variables documented (which ones are required)
[ ] CORS settings correct for production domain
[ ] ALLOWED_HOSTS includes production domain
[ ] SECRET_KEY is not the development default
[ ] Static files configuration is correct (WhiteNoise, S3, etc.)
```

---

## Deployment Workflow

### Phase 1: Prepare

1. **Run pre-flight checklist** — every item above
2. **Review git status** — no uncommitted changes, clean working tree
3. **Review git diff against main** — understand everything being deployed
4. **Tag the release** (optional but recommended):
   ```bash
   git tag -a v1.x.x -m "Description of release"
   ```

### Phase 2: Commit & Push

1. Stage only relevant files (never `git add -A` blindly)
2. Write a descriptive commit message (what changed + why)
3. Push to remote:
   ```bash
   git push origin main
   ```

### Phase 3: Deploy

#### Railway (This Project)

```bash
# Option A: CLI deploy (pushes current directory)
railway up --detach

# Option B: Auto-deploy from GitHub push (if configured)
# Just push to main — Railway watches the repo

# Run migrations on Railway
railway run python backend/manage.py migrate
```

#### General Platform Steps

| Platform | Command | Notes |
|----------|---------|-------|
| Railway | `railway up --detach` | Auto-detects Nixpacks/Dockerfile |
| Vercel | `vercel --prod` | For frontend/serverless |
| Heroku | `git push heroku main` | Uses Procfile |
| AWS EB | `eb deploy` | Uses .ebextensions |
| Docker | `docker build && docker push` | Then update service |

### Phase 4: Post-Deploy Verification (MANDATORY)

**Never skip this.** A deploy without verification is not done.

```bash
# 1. Health check
curl -s https://<production-url>/health

# 2. Smoke test critical endpoints
curl -s https://<production-url>/api/v1/traces | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d['success'] else 'FAIL')"

# 3. Frontend serves correctly
curl -s https://<production-url>/ | grep -q '<title>' && echo "Frontend OK"

# 4. Check for new errors in logs
railway logs | tail -20   # or equivalent for your platform
```

### Phase 5: Rollback Plan

If post-deploy verification fails:

```bash
# Railway: redeploy previous version from dashboard
# Or revert commit and redeploy:
git revert HEAD
git push origin main
railway up --detach
```

---

## Industry Best Practices

### The 12-Factor App Checklist
1. **Codebase** — One repo, many deploys (dev/staging/prod)
2. **Dependencies** — Explicitly declared (requirements.txt)
3. **Config** — Stored in environment variables, never in code
4. **Backing services** — Treat DB, Redis, APIs as attached resources
5. **Build/release/run** — Strict separation between stages
6. **Processes** — Stateless processes (no local file storage in prod)
7. **Port binding** — Export services via port binding
8. **Concurrency** — Scale via process model (gunicorn workers)
9. **Disposability** — Fast startup, graceful shutdown
10. **Dev/prod parity** — Keep environments as similar as possible
11. **Logs** — Treat as event streams (stdout, not files)
12. **Admin processes** — Run as one-off commands (migrations, shells)

### Zero-Downtime Deployment
- Use rolling deploys (Railway/Heroku do this by default)
- Database migrations must be backward-compatible
- Never rename/drop columns in the same deploy as code changes
- Two-phase migration: (1) add new column, (2) migrate code, (3) drop old column

### Security Checklist
- [ ] No secrets in git history (use `git log -p | grep -i "sk-\|api_key\|password"`)
- [ ] HTTPS enforced in production
- [ ] CORS restricted to known domains (not `*` in production ideally)
- [ ] Rate limiting on public API endpoints
- [ ] SQL injection protection (use ORM, never raw queries with user input)
- [ ] CSRF protection on mutation endpoints (or API-key auth)

### Monitoring (Post-Deploy)
- Set up health check endpoint (`/health`)
- Monitor error rates for 15 minutes after deploy
- Set up alerts for 5xx error spike
- Track response latency (p50, p95, p99)
- Log aggregation (Railway logs, Datadog, Sentry)

---

## Common Deployment Mistakes

| Mistake | Prevention |
|---------|------------|
| Deploying with DEBUG=True | Pre-flight check: grep for DEBUG in settings |
| Hardcoded localhost URLs | Use environment variables for all URLs |
| Missing migrations | Pre-flight: `python manage.py showmigrations` |
| Secrets in git | .gitignore + pre-commit hook + grep check |
| No rollback plan | Always know how to revert (previous commit, dashboard) |
| Skipping post-deploy verification | Make it part of the workflow, not optional |
| Deploying on Friday afternoon | Just don't (unless you have excellent monitoring) |
| No CORS for cross-origin API | Check CORS settings match production domains |
| Static files not collected | Run `collectstatic` or configure WhiteNoise |
| DB schema incompatible with old code | Two-phase migrations |

---

## Quality Guidelines

**ALWAYS:**
- Run the full pre-flight checklist before deploying
- Verify the deployment is live after deploying (curl health endpoint)
- Check logs for errors after deploy
- Have a rollback plan before you deploy
- Use environment variables for all configuration
- Commit and push before deploying

**NEVER:**
- Deploy uncommitted changes
- Skip post-deploy verification
- Deploy with hardcoded secrets
- Force-push to production branch without team awareness
- Deploy database-breaking migrations without a migration plan
- Leave DEBUG=True in production
- Deploy without running tests first
