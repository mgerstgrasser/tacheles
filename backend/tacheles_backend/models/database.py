from os import environ

from sqlmodel import Session, SQLModel, create_engine

from .models import *  # noqa

# Here, we set up the database connection. We use the DATABASE_URL environment.
# If the DATABASE_URL environment variable is not set, we default to a SQLite.
# This is already very flexible, as it allows us to use any database supported
# by SQLAlchemy, just by setting the DATABASE_URL environment variable.
# But you could still wish to make changes here, e.g. to set up a connection pool.

DATABASE_URL = environ.get("DATABASE_URL", "sqlite:////database/database.db")

engine = create_engine(DATABASE_URL)


def get_db():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


if __name__ == "__main__":
    # We can also use this script to create all the database tables.
    # By default this is run on uvicorn startup for convenience,
    # but in production environments you may wish to disable that,
    # and use this script to set up the database manually.
    create_db_and_tables()
    print("Database tables created")
