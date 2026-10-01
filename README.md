# menu_giochi

Static website, developed inside a sandboxed VS Code devcontainer with Claude
Code.

## Getting started

1. Install [Docker](https://www.docker.com/) and the [VS Code Dev Containers
   extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
   Claude Code itself does **not** need to be installed on your machine — it runs inside the
   container.
2. Open this folder in VS Code and choose **Dev Containers: Reopen in Container** from the
   Command Palette (first build downloads the base image and installs tooling, so it takes
   a few minutes).
3. Open a terminal inside the container and run `claude` once to sign in. The session is
   saved to `.devcontainer/claude-home/` (gitignored) and persists across container rebuilds,
   so you only sign in once per project.

## Usage

This is a plain static website: hand-written HTML, CSS and JavaScript with **no build
step, framework or package manager**. The repository root is the deploy root — a static
host (GitHub Pages, Netlify, S3, nginx, ...) serves this folder exactly as it is.

Preview it from inside the devcontainer:

```console
$ python3 -m http.server 8000    # from the repository root
```

Then open http://localhost:8000 (port 8000 is forwarded from the devcontainer).

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | The page, with its styles inline |
| `app.js` | Cards, filters and game detail modal (rulebooks, video tutorials) |
| `data.js` | Generated game data (`update_data.py`) |
| `i18n.js` | Italian translations |
| `favicon.png`, `robots.txt` | Icon and crawler rules |

Dev-only files (scripts, CSV exports, `.env`, tooling) are gitignored.


## Deploying

Publish the repository root with any static host. There is nothing to compile: point the
host at this folder (or push the branch, for GitHub Pages) and it is live.

## Development conventions

See [CLAUDE.md](./CLAUDE.md) for the full set of conventions this project follows
(code style, versioning, commit and test discipline).

## Keeping the devcontainer up to date

`.cdforge.json` records the answers this project was generated from. Running
`cdforge adopt` **on the host** (not inside the container — `.devcontainer/` is read-only
there) re-renders the managed files — `.devcontainer/`, `.githooks/`, `.claude/` — from the
installed version of cdforge, merges its entries into `.gitignore` and
`.claude/settings.json`, and never touches this project's own source code or documents.
Use `cdforge adopt --dry-run` to see what would change first.

## Sandboxing

The devcontainer only mounts this project's folder and its own Claude Code config
directory — no other part of the host *filesystem* is reachable from inside it. It runs as an
ordinary, **unprivileged** container: it has no access to the host's block devices, Docker
socket, or filesystem. `.devcontainer/` is mounted read-only, so the sandbox definition itself
cannot be rewritten from inside the container.

**The network is not part of that sandbox.** Like any devcontainer, this one sits on a Docker
bridge: it can reach the internet, your LAN, and the host itself through the bridge gateway,
so ports listening on the host (SSH, databases, dev servers) are reachable from inside the
container. Only the filesystem is isolated. Re-run `cdforge adopt` on the host and pick a
network firewall mode if you want that closed.

One thing to keep in mind: the project folder is the *same files* on the host disk. Anything
in it that **the host** later runs — git hooks under `.git/hooks`, an editor task in
`.vscode/`, a script you execute on the host — runs with your privileges, not the
container's. Prefer working inside the container, and review changes (they are tracked in
git) before running project tooling directly on the host.
