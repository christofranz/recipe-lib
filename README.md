# recipe-lib
recipe-poc/
├── api/
│   └── index.py            # Complete Backend (DB + API)
├── src/
│   └── App.tsx             # Frontend Logic
├── requirements.txt        # Python Deps
├── package.json            # JS Deps
├── vercel.json             # Deployment Config
├── vite.config.ts          # Local Proxy Config
└── index.html              # Entry HTML

# Create environment
python3.8 -m venv venv  # Explicitly using 3.8 if you have multiple versions
source venv/bin/activate

# Install
pip install -r requirements.txt

# Run
uvicorn api.index:app --reload --port 8000 --env-file .env

# Frontend
npm install
npm run dev

2. Deploy to Vercel (Uses Postgres)
Push to GitHub: Commit all files and push to a new repo.

Import to Vercel: Create a new project in Vercel from that repo.

Deploy (First Pass): It might look like it's working, but it will error on the backend because the DB isn't connected yet.

Connect Database:

In the Vercel Project Dashboard, go to Storage.

Click Connect Store -> Postgres -> Create New.

Select a Region (e.g., Frankfurt).

Click Create.

Important: Once created, Vercel automatically adds environment variables like POSTGRES_URL to your project settings.

Redeploy:

Go to Deployments.

Click the three dots on the latest deployment -> Redeploy.

Why? The app needs to rebuild to see the new Database Environment Variables.

Verify:

Open your App URL.

The backend will detect POSTGRES_URL, run the startup event, create the table in Postgres, and seed the data.

Your App will show the "Spicy DB-Powered Shrimp".


ENV Variables: Dashboard -> Settings -> env variables -> manually add variables from prisma postgres

tailwind: npm install -D tailwindcss postcss autoprefixer and had to add postcss.config.js

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p


Extension of app: npm install react-router-dom

set jwt keys and alo in .env file, .env file can be imported in vercel


-- DB Migration --
alembic init alembic

✅ The ONLY correct way to migrate schemas (step-by-step)
0️⃣ Preconditions (do this once)
One Base, one metadata
# api/db/base.py
from sqlalchemy.orm import declarative_base
Base = declarative_base()


All models must import this Base.

Central model import (critical for Alembic)
# api/db/models/__init__.py
from .recipe import RecipeDB
from .user import UserDB


Alembic must see all models.

1️⃣ Configure Alembic correctly (production-safe)
alembic/env.py (key parts)
import os
from alembic import context
from sqlalchemy import engine_from_config, pool
from api.db.base import Base
from api.db import models  # IMPORTANT: imports all models

target_metadata = Base.metadata

def get_url():
    url = os.getenv("PROD_POSTGRES_URL")
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    return "sqlite:///./local.db"


Online migration:

def run_migrations_online():
    connectable = engine_from_config(
        context.config.get_section(context.config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"sslmode": "require"} if "postgres" in get_url() else {},
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

2️⃣ Migration strategy for production data (VERY IMPORTANT)

Never break existing rows.
Migrations must be incremental and reversible.

3️⃣ Example: migrating recipes → users ownership (SAFE)
Step A — generate migration
alembic revision --autogenerate -m "add users and recipe owner"

Step B — MANUALLY FIX the migration which is in alembic/versions/...migration.py
could take automated code from alembic since user already existed
def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_approved', sa.Boolean(), server_default='false'),
    )

    op.add_column(
        'recipes',
        sa.Column('owner_id', sa.Integer(), nullable=True)
    )

    op.create_foreign_key(
        'fk_recipes_owner',
        'recipes',
        'users',
        ['owner_id'],
        ['id'],
        ondelete='SET NULL'
    )


❗ nullable=True is intentional.

4️⃣ Apply migration to PRODUCTION DB
PROD_POSTGRES_URL="postgres://..." alembic upgrade head


✔️ This executes SQL directly on the Prisma DB
✔️ No Prisma tooling involved

5️⃣ (Optional) Backfill data
INSERT INTO users (email, hashed_password, is_active, is_approved)
VALUES ('admin@system', '!', true, true);

UPDATE recipes
SET owner_id = 1
WHERE owner_id IS NULL;

6️⃣ (Optional) Enforce NOT NULL later

New migration:

alembic revision -m "make recipe owner mandatory"

def upgrade():
    op.alter_column('recipes', 'owner_id', nullable=False)

7️⃣ Verify migration state (always do this)
alembic current
alembic history


And sanity check:

from api.db.session import engine
print(engine.dialect.name)
print(engine.url)

8️⃣ Golden rules for schema migrations (memorize)

✅ One Base
✅ One import path
✅ Alembic owns schema
✅ Nullable first, enforce later
✅ Review autogen output
❌ Never mix Prisma + Alembic
❌ Never create_all() in prod
❌ Never autogen & deploy blindly