# Repository Guidelines

## Project Structure & Module Organization
- `app.py`: Flask application, routes, models, background RSS fetcher.
- `templates/` and `static/`: Jinja templates and static assets.
- `instance/`: local SQLite DB (`users.db`) and instance config (gitignored).
- `requirements.txt`: Python dependencies.
- `test_system.py`: lightweight HTTP smoke tests against a running server.
- Optional: `SUPABASE_MIGRATION_GUIDE.md`, `supabase_schema.sql` (for Supabase experiments).

## Build, Test, and Development Commands
- Install deps: `pip install -r requirements.txt`
- Run dev server: `python3 app.py` (serves on `http://127.0.0.1:8088`).
- Run with Gunicorn: `gunicorn app:app -b 0.0.0.0:8088`
- Smoke tests (server must be running): `python3 test_system.py`

Environment variables (examples):
- `SECRET_KEY=change-me` (session signing)
- `RSS_FEED_URLS="https://sspai.com/feed,https://rsshub.app/sspai/index?limit=100"`
- `RSS_FETCH_INTERVAL_SECONDS=300` and `RSS_FETCH_LIMIT=1000`

## Coding Style & Naming Conventions
- Follow PEP 8: 4-space indent, readable names.
- Modules/functions: `snake_case`; classes: `PascalCase`; constants: `UPPER_SNAKE`.
- Templates: page views under `templates/`, shared pieces as partials.
- Keep handlers small; move helpers to top-level functions in `app.py` or a new module if cohesion improves.
- No enforced formatter in CI; avoid mass reformatting unrelated lines.

## Testing Guidelines
- `test_system.py` performs basic registration/login/dashboard checks via HTTP.
- Ensure server is running on `http://localhost:8088` before executing tests.
- Prefer adding route-specific tests next to `test_system.py` and keep them idempotent.

## Commit & Pull Request Guidelines
- Commits: imperative mood and scoped, e.g., `feat(auth): add session check`.
- Keep changes focused; include reasoning in the body when behavior changes.
- PRs: clear description, steps to reproduce, screenshots for UI, and linked issues (e.g., `Closes #123`).
- Include config/env notes when behavior depends on environment variables.

## Security & Configuration Tips
- Do not commit secrets; `.env` and `instance/` are gitignored.
- Change `SECRET_KEY` in production and prefer Gunicorn or a WSGI host.
- SQLite lives under `instance/`; back up before schema changes.
- Supabase is optional; see `SUPABASE_MIGRATION_GUIDE.md` before enabling.

