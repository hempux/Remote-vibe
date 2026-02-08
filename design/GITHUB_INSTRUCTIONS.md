# GitHub Workflow Instructions - Remote Vibe

## Table of Contents
1. [Repository Setup](#repository-setup)
2. [Branching Strategy](#branching-strategy)
3. [Commit Conventions](#commit-conventions)
4. [Pull Request Process](#pull-request-process)
5. [Issue Management](#issue-management)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [Project Structure in Git](#project-structure-in-git)
8. [Multi-Agent Workflow](#multi-agent-workflow)
9. [Merge Strategy](#merge-strategy)
10. [Code Review Guidelines](#code-review-guidelines)
11. [Release Process](#release-process)
12. [GitHub Projects Setup](#github-projects-setup)
13. [Security Best Practices](#security-best-practices)
14. [Documentation Standards](#documentation-standards)

---

## Repository Setup

### Initial Configuration

```bash
# Clone the repository
git clone https://github.com/[org]/remote-vibe.git
cd remote-vibe

# Configure user
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set default branch
git config init.defaultBranch main
```

### .gitignore Configuration

The repository should include comprehensive `.gitignore` files:

**Root `.gitignore`:**
```gitignore
# IDE and Editor
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment files
.env
.env.local
.env.*.local
*.key
*.pem

# Logs
logs/
*.log
npm-debug.log*

# Temporary files
tmp/
temp/
*.tmp

# OS files
Thumbs.db
```

**Backend `.gitignore`:**
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.pytest_cache/
.coverage
htmlcov/

# Database
*.db
*.sqlite3
*.sql
db.sqlite3-journal

# Django
media/
staticfiles/
```

**Mobile `.gitignore`:**
```gitignore
# React Native
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.expo/
.expo-shared/

# iOS
ios/Pods/
ios/build/
*.xcworkspace
*.pbxuser
*.xcuserstate
DerivedData/

# Android
android/.gradle/
android/build/
android/app/build/
android/app/release/
*.apk
*.aab
local.properties

# Metro
.metro-health-check*
```

---

## Branching Strategy

### Branch Hierarchy

```
main (production-ready)
  ↑
develop (integration branch)
  ↑
feature/* (feature branches)
  ↑
agent/* (agent-specific branches)
```

### Branch Types

#### 1. Main Branch (`main`)
- **Purpose**: Production-ready code only
- **Protection**: Required PR reviews, status checks must pass
- **Deployment**: Auto-deploys to production
- **Access**: Merge only from `develop` via release PRs

#### 2. Develop Branch (`develop`)
- **Purpose**: Integration branch for all features
- **Protection**: Required PR reviews, CI must pass
- **Deployment**: Auto-deploys to staging
- **Access**: Merge from feature branches

#### 3. Feature Branches (`feature/*`)
- **Naming**: `feature/phase-X-description`
- **Examples**: 
  - `feature/phase-1-auth-system`
  - `feature/phase-2-room-creation`
  - `feature/phase-3-webrtc-signaling`
- **Lifecycle**: Branch from `develop`, merge back to `develop`
- **Deletion**: Auto-delete after merge

#### 4. Agent Branches (`agent/*`)
- **Naming**: `agent/[agent-name]/[task]`
- **Examples**:
  - `agent/backend-agent/implement-auth`
  - `agent/mobile-agent/build-ui-components`
  - `agent/devops-agent/setup-ci`
- **Purpose**: Work-in-progress for AI agents
- **Lifecycle**: Frequently merged to feature branches

#### 5. Hotfix Branches (`hotfix/*`)
- **Naming**: `hotfix/critical-bug-description`
- **Purpose**: Emergency production fixes
- **Lifecycle**: Branch from `main`, merge to both `main` and `develop`

#### 6. Release Branches (`release/*`)
- **Naming**: `release/v1.0.0`
- **Purpose**: Prepare for production release
- **Lifecycle**: Branch from `develop`, merge to `main` and back to `develop`

### Branch Naming Conventions

```bash
# Feature branches
feature/phase-[number]-[short-description]

# Agent working branches
agent/[agent-role]/[task-name]

# Bugfix branches
bugfix/[issue-number]-[description]

# Hotfix branches
hotfix/[severity]-[description]

# Release branches
release/v[major].[minor].[patch]
```

---

## Commit Conventions

### Conventional Commits Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add JWT token validation` |
| `fix` | Bug fix | `fix(rooms): resolve duplicate room creation` |
| `docs` | Documentation only | `docs(api): update authentication endpoints` |
| `style` | Code style/formatting | `style(backend): apply black formatter` |
| `refactor` | Code refactoring | `refactor(webrtc): simplify peer connection logic` |
| `perf` | Performance improvement | `perf(api): add database query caching` |
| `test` | Add/update tests | `test(auth): add integration tests for login` |
| `build` | Build system changes | `build(mobile): update react-native to 0.72` |
| `ci` | CI/CD changes | `ci(github): add automated testing workflow` |
| `chore` | Maintenance tasks | `chore(deps): update dependencies` |
| `revert` | Revert previous commit | `revert: feat(auth): add JWT validation` |

### Scope Examples

- `auth` - Authentication/authorization
- `rooms` - Room management
- `webrtc` - WebRTC functionality
- `ui` - User interface
- `api` - API endpoints
- `db` - Database changes
- `mobile` - Mobile app
- `backend` - Backend service
- `devops` - DevOps/infrastructure

### Commit Message Examples

```bash
# Good commits
feat(auth): implement user registration endpoint
fix(webrtc): resolve ice candidate gathering timeout
docs(readme): add setup instructions for mobile app
refactor(db): migrate to PostgreSQL from SQLite
test(rooms): add unit tests for room creation

# Bad commits
update stuff
fix bug
WIP
asdf
quick fix
```

### Commit Best Practices

1. **Atomic Commits**: Each commit should represent one logical change
2. **Present Tense**: Use "add" not "added", "fix" not "fixed"
3. **Imperative Mood**: "change" not "changes" or "changed"
4. **No Period**: Don't end the subject line with a period
5. **50/72 Rule**: Subject ≤50 chars, body wrapped at 72 chars
6. **Reference Issues**: Include issue numbers in footer

```bash
# Example with body and footer
feat(api): add rate limiting to authentication endpoints

Implement token bucket algorithm for rate limiting on login
and registration endpoints to prevent brute force attacks.

Closes #123
Related to #456
```

---

## Pull Request Process

### PR Template

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description
<!-- Provide a brief description of the changes -->

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bug fix (resolves an issue)
- [ ] Refactoring (code improvement)
- [ ] Documentation update
- [ ] CI/CD change
- [ ] Performance improvement

## Phase
- [ ] Phase 1 - Foundation & Authentication
- [ ] Phase 2 - Room Management
- [ ] Phase 3 - WebRTC Integration
- [ ] Phase 4 - Mobile App
- [ ] Phase 5 - Polish & Deployment

## Related Issues
Closes #[issue-number]
Related to #[issue-number]

## Changes Made
<!-- List the key changes -->
- 
- 
- 

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Test coverage maintained/improved

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Dependent changes merged
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented (if applicable)

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Additional Notes
<!-- Any additional context -->
```

### PR Workflow

1. **Create PR from feature branch to develop**
   ```bash
   git checkout -b feature/phase-1-auth-system develop
   # Make changes
   git push -u origin feature/phase-1-auth-system
   # Create PR via GitHub UI
   ```

2. **PR Title Format**: Follow conventional commit format
   ```
   feat(auth): implement user registration and login system
   ```

3. **Assign Reviewers**: Minimum 1 reviewer required

4. **Link Issues**: Use GitHub keywords (Closes, Fixes, Resolves)

5. **Continuous Updates**: Keep PR updated with develop
   ```bash
   git checkout feature/phase-1-auth-system
   git fetch origin
   git merge origin/develop
   ```

6. **Address Review Comments**: Make changes and push

7. **Approval & Merge**: After approval, squash and merge

---

## Issue Management

### Issue Templates

#### Feature Request Template
`.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest a new feature for Remote Vibe
title: '[FEATURE] '
labels: 'enhancement'
assignees: ''
---

## Feature Description
<!-- Clear description of the feature -->

## Phase
- [ ] Phase 1 - Foundation & Authentication
- [ ] Phase 2 - Room Management
- [ ] Phase 3 - WebRTC Integration
- [ ] Phase 4 - Mobile App
- [ ] Phase 5 - Polish & Deployment

## User Story
As a [type of user], I want [goal] so that [benefit]

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Technical Considerations
<!-- Architecture, dependencies, challenges -->

## Priority
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low
```

#### Bug Report Template
`.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug in Remote Vibe
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## Bug Description
<!-- Clear description of the bug -->

## To Reproduce
Steps to reproduce:
1. 
2. 
3. 

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Environment
- OS: [e.g., iOS 16, Android 13, macOS]
- App Version: [e.g., 1.0.0]
- Device: [e.g., iPhone 14, Pixel 7]

## Logs/Screenshots
<!-- Add relevant logs or screenshots -->

## Severity
- [ ] Critical (app crash, data loss)
- [ ] High (major feature broken)
- [ ] Medium (feature partially broken)
- [ ] Low (minor issue)
```

### Issue Labels

| Label | Description | Color |
|-------|-------------|-------|
| `phase-1` | Phase 1 work | `#0E8A16` |
| `phase-2` | Phase 2 work | `#1D76DB` |
| `phase-3` | Phase 3 work | `#5319E7` |
| `phase-4` | Phase 4 work | `#E99695` |
| `phase-5` | Phase 5 work | `#F9D0C4` |
| `backend` | Backend-related | `#FBCA04` |
| `mobile` | Mobile app-related | `#D4C5F9` |
| `devops` | DevOps/infrastructure | `#D93F0B` |
| `enhancement` | New feature | `#A2EEEF` |
| `bug` | Bug fix needed | `#D73A4A` |
| `documentation` | Documentation update | `#0075CA` |
| `priority-high` | High priority | `#B60205` |
| `blocked` | Blocked by dependency | `#000000` |
| `agent-assigned` | Assigned to agent | `#BFDADC` |

---

## GitHub Actions CI/CD

### Workflow Structure

```
.github/
  workflows/
    backend-ci.yml
    mobile-ci.yml
    deploy-staging.yml
    deploy-production.yml
    security-scan.yml
```

### Backend CI Workflow
`.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI

on:
  push:
    branches: [develop, main]
    paths:
      - 'backend/**'
  pull_request:
    branches: [develop]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: remote_vibe_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run linting
        run: |
          cd backend
          black --check .
          flake8 .
          mypy .
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/remote_vibe_test
          REDIS_URL: redis://localhost:6379
        run: |
          cd backend
          pytest --cov=. --cov-report=xml --cov-report=term
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Bandit security scan
        run: |
          cd backend
          pip install bandit
          bandit -r . -f json -o bandit-report.json
      
      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: backend/bandit-report.json
```

### Mobile CI Workflow
`.github/workflows/mobile-ci.yml`:

```yaml
name: Mobile CI

on:
  push:
    branches: [develop, main]
    paths:
      - 'mobile/**'
  pull_request:
    branches: [develop]
    paths:
      - 'mobile/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Install dependencies
        run: |
          cd mobile
          npm ci
      
      - name: Run linting
        run: |
          cd mobile
          npm run lint
      
      - name: Run type checking
        run: |
          cd mobile
          npm run type-check
      
      - name: Run tests
        run: |
          cd mobile
          npm test -- --coverage --watchAll=false
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/coverage/coverage-final.json
          flags: mobile

  build-ios:
    runs-on: macos-latest
    needs: test
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd mobile
          npm ci
      
      - name: Build iOS
        run: |
          cd mobile/ios
          pod install
          xcodebuild -workspace RemoteVibe.xcworkspace \
            -scheme RemoteVibe -configuration Release \
            -sdk iphoneos CODE_SIGNING_ALLOWED=NO

  build-android:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd mobile
          npm ci
      
      - name: Build Android
        run: |
          cd mobile/android
          ./gradlew assembleRelease
```

---

## Project Structure in Git

```
remote-vibe/
├── .github/
│   ├── workflows/           # CI/CD workflows
│   ├── ISSUE_TEMPLATE/      # Issue templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS           # Code ownership
├── backend/
│   ├── apps/                # Django apps
│   ├── config/              # Django settings
│   ├── tests/               # Test files
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
├── mobile/
│   ├── src/                 # Source code
│   ├── __tests__/           # Test files
│   ├── ios/                 # iOS-specific
│   ├── android/             # Android-specific
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── design/                  # Design documents
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .gitignore
├── README.md
└── LICENSE
```

---

## Multi-Agent Workflow

### Concurrent Development Strategy

Multiple AI agents can work simultaneously on different phases:

#### Agent Coordination

1. **Backend Agent** works on `agent/backend-agent/*`
2. **Mobile Agent** works on `agent/mobile-agent/*`
3. **DevOps Agent** works on `agent/devops-agent/*`

#### Workflow Example

```bash
# Backend Agent - Phase 1
git checkout develop
git pull origin develop
git checkout -b agent/backend-agent/auth-implementation
# Work on authentication
git commit -m "feat(auth): implement user registration"
git push origin agent/backend-agent/auth-implementation
# Create PR to feature/phase-1-auth-system

# Mobile Agent - Phase 2 (concurrent)
git checkout develop
git pull origin develop
git checkout -b agent/mobile-agent/room-ui
# Work on room UI
git commit -m "feat(ui): create room list screen"
git push origin agent/mobile-agent/room-ui
# Create PR to feature/phase-2-room-management

# DevOps Agent - Infrastructure (concurrent)
git checkout develop
git pull origin develop
git checkout -b agent/devops-agent/docker-setup
# Setup Docker
git commit -m "build(docker): add production Dockerfile"
git push origin agent/devops-agent/docker-setup
# Create PR to develop
```

#### Conflict Prevention

1. **Work in Different Directories**: Agents focus on separate areas
2. **Frequent Syncing**: Pull from develop regularly
3. **Small PRs**: Keep changes focused and mergeable
4. **Communication**: Use PR comments and issue threads
5. **Feature Flags**: Use flags for incomplete features

---

## Merge Strategy

### Squash and Merge (Default)

- **Use for**: Feature branches → develop
- **Benefits**: Clean linear history
- **Result**: All commits squashed into one

```bash
# Via GitHub UI or:
git merge --squash feature/phase-1-auth-system
git commit -m "feat(auth): implement complete authentication system"
```

### Merge Commit

- **Use for**: Release branches, develop → main
- **Benefits**: Preserves branch history
- **Result**: Creates merge commit

```bash
git merge --no-ff release/v1.0.0
```

### Rebase and Merge

- **Use for**: Small, atomic commits worth preserving
- **Benefits**: Linear history with individual commits
- **Result**: Commits added on top of base branch

```bash
git rebase develop
git merge --ff-only feature/small-fix
```

### Branch Protection Rules

**`main` branch:**
- Require pull request reviews (2 approvals)
- Require status checks to pass
- Require branches to be up to date
- No force pushes
- No deletions

**`develop` branch:**
- Require pull request reviews (1 approval)
- Require status checks to pass
- Allow force pushes (for maintainers only)

---

## Code Review Guidelines

### Review Checklist

#### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] No obvious bugs

#### Code Quality
- [ ] Follows project conventions
- [ ] DRY principle applied
- [ ] Functions/methods are focused
- [ ] Naming is clear and descriptive

#### Testing
- [ ] Tests included and passing
- [ ] Coverage maintained/improved
- [ ] Tests are meaningful

#### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Authentication/authorization correct
- [ ] SQL injection prevention

#### Performance
- [ ] No unnecessary database queries
- [ ] Efficient algorithms used
- [ ] No memory leaks

#### Documentation
- [ ] README updated if needed
- [ ] API docs updated
- [ ] Comments for complex logic

### Review Response Time

- **Critical PRs**: 2 hours
- **Standard PRs**: 24 hours
- **Documentation PRs**: 48 hours

### Review Etiquette

- Be constructive and specific
- Explain the "why" behind suggestions
- Acknowledge good work
- Ask questions rather than make demands
- Focus on the code, not the author

---

## Release Process

### Versioning (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Workflow

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. Update version numbers
# - backend/config/settings.py
# - mobile/package.json
# - mobile/ios/Info.plist
# - mobile/android/app/build.gradle

# 3. Update CHANGELOG.md
# Add all changes since last release

# 4. Commit version bump
git commit -m "chore(release): bump version to 1.0.0"

# 5. Create PR to main
# After approval and CI passes:

# 6. Merge to main
git checkout main
git merge --no-ff release/v1.0.0

# 7. Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 8. Merge back to develop
git checkout develop
git merge --no-ff release/v1.0.0

# 9. Delete release branch
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

---

## GitHub Projects Setup

### Project Board Structure

**Board Name**: Remote Vibe Development

**Columns**:
1. **Backlog** - Future work
2. **Phase 1** - Foundation & Authentication
3. **Phase 2** - Room Management
4. **Phase 3** - WebRTC Integration
5. **Phase 4** - Mobile App
6. **Phase 5** - Polish & Deployment
7. **In Progress** - Currently being worked on
8. **In Review** - PR submitted
9. **Done** - Completed and merged

### Automation Rules

- New issues → Backlog
- Issue assigned → Appropriate Phase
- PR created → In Review
- PR merged → Done
- Issue closed → Done

---

## Security Best Practices

### Secrets Management

```bash
# NEVER commit secrets
# Use .env files (in .gitignore)
# Use GitHub Secrets for CI/CD

# Example .env.example
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

### Dependency Security

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  push:
    branches: [main, develop]

jobs:
  backend-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Safety check
        run: |
          pip install safety
          safety check -r backend/requirements.txt
  
  mobile-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: |
          cd mobile
          npm audit --audit-level=moderate
```

### Code Scanning

Enable GitHub Advanced Security:
- Dependabot alerts
- Code scanning (CodeQL)
- Secret scanning

---

## Documentation Standards

### Code Comments

```python
# Backend - Use docstrings
def create_room(name: str, creator_id: int) -> Room:
    """
    Create a new video chat room.
    
    Args:
        name: The name of the room
        creator_id: ID of the user creating the room
    
    Returns:
        Room: The created room instance
    
    Raises:
        ValidationError: If room name is invalid
    """
    pass
```

```typescript
// Mobile - Use JSDoc
/**
 * Connects to a video chat room
 * @param roomId - The unique identifier of the room
 * @param userId - The user's identifier
 * @returns Promise that resolves when connected
 * @throws {ConnectionError} If connection fails
 */
async function connectToRoom(roomId: string, userId: string): Promise<void> {
  // Implementation
}
```

### API Documentation

- Use OpenAPI/Swagger for REST APIs
- Document all endpoints, parameters, responses
- Include example requests/responses
- Keep docs up to date with code

### README Updates

Update README.md when:
- Setup process changes
- New dependencies added
- Configuration changes
- New features that affect usage

---

## Quick Reference Commands

```bash
# Start new feature
git checkout develop && git pull
git checkout -b feature/phase-X-description

# Sync with develop
git fetch origin
git merge origin/develop

# Create PR (after pushing)
gh pr create --base develop --title "feat(scope): description"

# Update PR
git commit -m "fix(scope): address review comments"
git push

# Clean up merged branches
git branch -d feature/phase-X-description
git remote prune origin

# View branch structure
git log --graph --oneline --all

# Check what's changed
git status
git diff
git diff --staged
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: Remote Vibe Development Team
