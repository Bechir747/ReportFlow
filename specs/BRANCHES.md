# BRANCHES.md — ReportFlow Git Branch Strategy

---

## 1. Branching Model

Adapted **Git Flow** for a monorepo with parallel frontend/backend work.

```
main    ────────────●────────────────────●────────────────────●──
                   /↑\                  /↑\                  /↑\
                  / |  \               / |  \               / |  \
release/         ●──●   \            ●──●   \            ●──●   \
                /         \         /         \         /         \
develop  ──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──
            \  /   \  /               \  /   \  /
feature/     ●       ●                 ●       ●
```

---

## 2. Branch Types & Naming

| Type | Pattern | Example | Lifecycle |
|------|---------|---------|-----------|
| **main** | `main` | `main` | Permanent. Production-ready only. |
| **develop** | `develop` | `develop` | Permanent. Integration branch. |
| **feature** | `feature/<epic-id>-<kebab-description>` | `feature/E1-docker-compose` | From `develop`, merged back to `develop`. Deleted after merge. |
| **release** | `release/sprint-<n>` | `release/sprint-1` | From `develop` at sprint end. Merged to `main` + `develop`. Deleted after merge. |
| **hotfix** | `hotfix/<kebab-description>` | `hotfix/fix-jwt-expiry` | From `main`. Merged to `main` + `develop`. Deleted after merge. |
| **bugfix** | `bugfix/<kebab-description>` | `bugfix/upload-validation` | From `develop`. Merged to `develop`. Deleted after merge. |
| **chore** | `chore/<kebab-description>` | `chore/update-deps` | Same as feature but for non-functional changes. |

---

## 3. Feature Branch Workflow

```
[Start]     git checkout -b feature/E3-report-models develop
[Work]      Commit frequently with small, logical changes
[Sync]      git fetch origin && git rebase origin/develop
[PR]        Open pull request → develop
[Review]    Self-review checklist if working solo (see section 5)
[Merge]     --no-ff merge into develop (preserves branch history)
[Cleanup]   Delete remote branch
```

### Parallel Development Rules

| Scenario | Strategy |
|----------|----------|
| Backend + frontend for same epic | Single branch — they are coupled |
| Backend + frontend for different epics | Separate branches — they are independent |
| Epic spans 2 sprints | Sub-branches: `feature/E3a-report-models`, `feature/E3b-admin-api` |

---

## 4. Commit Message Convention

```
<type>(<scope>): <imperative description>

[optional body — explain why, not what]
[Epic: E3]
[Closes #12]
```

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config, seeding |
| `style` | Formatting, linting (no logic change) |

**Examples:**
```
feat(api): add POST /reports endpoint with date validation
feat(ui): add report creation form for admin dashboard
feat(kafka): emit report.created on report creation
fix(auth): handle expired JWT token refresh
refactor(models): extract base SQLAlchemy mixin
test(workflow): add integration test for TO_REDO cycle
chore(seed): add user seeder for all three roles
```

---

## 5. Solo Review Checklist

Since this is a solo or small-team project, use this checklist before merging any branch into `develop`:

- [ ] All tasks for this branch are complete
- [ ] No debug prints, commented-out code, or TODOs left in
- [ ] New endpoints have basic error handling and return correct HTTP codes
- [ ] Kafka producers emit the correct topic for the action
- [ ] Status transitions are guarded (no invalid state changes possible)
- [ ] `.env.example` updated if new env vars were added
- [ ] `docker compose up` still boots cleanly

---

## 6. Branch Protection Rules

### `main`
- No direct pushes — merges from `release/*` or `hotfix/*` only
- Requires pull request with 1 approval
- Requires CI to pass (see section 7)
- Must be up-to-date before merging

### `develop`
- No direct pushes — merges from `feature/*`, `bugfix/*`, or `chore/*` only
- Requires pull request with 1 approval
- Requires CI to pass
- Merge with `--no-ff` to preserve branch history and Kafka/event flow context

### `feature/*`, `bugfix/*`, `chore/*`
- No protection rules
- Push freely, rebase often against `develop`

---

## 7. CI Pipeline (Minimum)

Runs on every push to `feature/*`, `bugfix/*`, `chore/*`, and on PRs to `develop` and `main`.

```
lint → test → build
```

| Step | Tool | Scope |
|------|------|-------|
| Lint | `ruff` (backend), `eslint` (frontend) | All changed files |
| Type check | `mypy` (backend) | All changed files |
| Unit tests | `pytest` (backend), `vitest` (frontend) | Full suite |
| Build | `docker compose build` | Both services |

> CI definition lives in `.github/workflows/ci.yml`. Add when repo is created.

---

## 8. Epic-to-Branch Mapping

| Sprint | Epic | Branch(es) | Note |
|--------|------|------------|------|
| 1 | E1 | `feature/E1-docker-compose` | Single branch — all infra |
| 1 | E2 | `feature/E2-auth` | Single branch — backend + frontend are coupled |
| 1 | E2 | `chore/user-seeder` | Separate — non-functional tooling |
| 1 | E3 | `feature/E3a-report-models` | Models + Alembic migration only |
| 2 | E3 | `feature/E3b-admin-api`, `feature/E3c-user-api` | API split by role scope |
| 2 | E4 | `feature/E4-file-upload` | Upload endpoint + versioning logic |
| 2 | E4 | `feature/E4-depositor-ui`, `feature/E4-approver-ui` | UI split — independent |
| 2–3 | E5 | `feature/E5a-review-api` | Review endpoint + status machine |
| 2–3 | E5 | `feature/E5b-version-history-ui` | Frontend only — depends on E5a |
| 3 | E6 | `feature/E6-scheduler` | APScheduler jobs |
| 3 | E6 | `feature/E6-notification-consumer` | Kafka consumer — independent of scheduler |
| 4 | E7 | `feature/E7-notifications-api` | Notification model + endpoints |
| 4 | E7 | `feature/E7-notifications-ui` | Depends on E7 API |
| 4 | E7 | `chore/integration-tests` | QA — non-feature work |

---

## 9. Release Process

```
develop ──●──●──●──● (sprint complete)
                    \
release/sprint-n     ●──●──● (QA fixes only)
                              \
main ──────────────────────────● (tag v{n}.0.0)
                                \
develop ────────────────────────● (merge back)
```

1. At sprint end, branch `release/sprint-<n>` from `develop`
2. Apply QA fixes directly on the release branch — no new features
3. Merge to `main` with `--no-ff`
4. Tag `main`: `v1.0.0`, `v2.0.0`, `v3.0.0`, `v4.0.0`
5. Merge release branch back to `develop` to preserve fixes
6. Delete the release branch

---

## 10. Quick Reference Commands

```bash
# Start a feature branch
git checkout develop && git pull
git checkout -b feature/E3a-report-models

# Sync when develop has advanced
git fetch origin
git rebase origin/develop

# Finish a feature branch (--no-ff preserves history)
git checkout develop && git pull
git merge --no-ff feature/E3a-report-models
git push origin develop
git branch -D feature/E3a-report-models
git push origin --delete feature/E3a-report-models

# Start a sprint release
git checkout develop && git pull
git checkout -b release/sprint-1
# Apply QA fixes and commit...
git checkout main && git merge release/sprint-1 --no-ff
git tag v1.0.0
git checkout develop && git merge release/sprint-1 --no-ff
git push origin main develop --tags
git branch -d release/sprint-1
git push origin --delete release/sprint-1

# Emergency hotfix from main
git checkout main && git pull
git checkout -b hotfix/fix-jwt-expiry
# Fix + commit...
git checkout main && git merge hotfix/fix-jwt-expiry --no-ff
git tag v1.0.1
git checkout develop && git merge hotfix/fix-jwt-expiry --no-ff
git push origin main develop --tags
git branch -d hotfix/fix-jwt-expiry
git push origin --delete hotfix/fix-jwt-expiry
```