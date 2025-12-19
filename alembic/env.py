import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make project root importable
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from api.db_models import Base, RecipeDB, UserDB  # IMPORTANT: imports all models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url():
    url = os.getenv("PROD_POSTGRES_URL")
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    return "sqlite:///./local_recipes.db"


def run_migrations_offline():
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"sslmode": "require"} if "postgresql" in get_url() else {},
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

config.set_main_option("sqlalchemy.url", get_url())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
