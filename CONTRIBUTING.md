# Contributing to Voltage

Welcome to the Voltage contributor community! We are excited to collaborate on building a next-generation open-source deployment engine that empowers developers to run edge-like preview deployments with 0ms cold starts, dynamic subdomain routing, and real-time SSE observability.

---

## Code of Conduct

Voltage adheres to standard open-source community standards. We are committed to providing a friendly, safe, and welcoming environment for all contributors regardless of experience level, background, or identity.

---

## Monorepo Architecture

Voltage is structured as an npm workspaces monorepo:

```
voltage/
├── dashboard/        # Next.js 14 App Router UI, Tailwind CSS, Lucide icons
├── control-plane/    # Express.js REST API & native containerless edge runner
├── edge-router/      # Dynamic subdomain reverse proxy & edge caching layer
├── cli/              # Voltage developer CLI
└── docs/             # Technical specifications & guides
```

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured on your machine
- **Docker** *(Optional)*: If running Docker-based sandboxed builds

### 1. Clone & Install
```bash
git clone https://github.com/Rishabh028/Voltage.git
cd Voltage
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root workspace and inside `control-plane`:
```bash
cp .env.example .env
```
Default ports:
- **Dashboard UI**: `http://localhost:3000`
- **Control Plane API**: `http://localhost:3001`
- **Edge Reverse Proxy**: `http://localhost:8080`

### 3. Run Development Servers
```bash
# Start all workspace services concurrently
npm run dev

# Or start individual services:
npm run dev --workspace=dashboard
npm run dev --workspace=control-plane
```

---

## Contribution Workflow

### 1. Branch Naming Conventions
Create a feature branch with a descriptive prefix:
- `feat/feature-name` — New feature or major capability
- `fix/bug-description` — Bug fix or error resolution
- `docs/topic-name` — Documentation improvements
- `perf/optimization` — Performance improvements
- `refactor/component` — Code refactoring without behavior change

```bash
git checkout -b feat/add-custom-ssl-terminator
```

### 2. Commit Message Guidelines
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

*Example*:
```bash
git commit -m "feat(edge-router): add wildcard SSL certificate hot-reloading"
```

### 3. Submitting Pull Requests
1. Ensure your branch is rebased on the latest `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Verify code builds without errors:
   ```bash
   npm run build
   ```
3. Open a Pull Request on GitHub against `main`.
4. Include a clear description of the problem solved, architectural changes, and screenshots/GIFs for UI changes.

---

## Questions and Support
- Open an [Issue](https://github.com/Rishabh028/Voltage/issues) for bug reports and feature proposals.
- Start a discussion in [GitHub Discussions](https://github.com/Rishabh028/Voltage/discussions) for architectural suggestions.
