import os
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .api.routes import router
from .models.database import create_db_and_tables

# Here we create and set up the FastAPI, and pull together all the components
# defined in api/routes.py and models/models.py

# First, we create the FastAPI app
app = FastAPI(
    title="Tacheles API",
    description="API backend for Tacheles, a blueprint for LLM chat applications.",
    version="1.0.0",
)

# Then we set up a session middleware. We use this for some basic session management
# and authentication.
app.add_middleware(SessionMiddleware, secret_key=uuid4().hex)

# We set up CORS, by default allowing all origins. This is useful for development,
# but you should restrict this to your frontend domain in production.
origins = [
    # "http://localhost:3000",  # This allows the frontend during development
    # "https://example.com",  # Add your real production domain here
    "*",  # Or allow all origins, effectively disabling CORS
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# We mount the API routes from `api/routes.py`
app.include_router(router, tags=["api"])

# Optionally, we mount the compiled frontend as a static directory
if os.environ.get("HOST_FRONTEND_PATH", False):
    app.mount(
        "/",
        StaticFiles(
            directory=os.environ.get("HOST_FRONTEND_PATH"),
            html=True,
            check_dir=False,
        ),
        name="frontend",
    )


# Create databases on startup
# This is enabled here as a convenience for development.
# In practice, you would set up databases manually, or
# use `python -m tacheles_backend.models.database` to create them.
@app.on_event("startup")
def on_startup():
    create_db_and_tables()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
