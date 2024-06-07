import json
import os
import sys
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# Here we define tests for the backend.

# First, we need to add the backend directory to the Python path.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tacheles_backend.models.database import get_db  # noqa
from tacheles_backend.tacheles_backend import app  # noqa

# Then, we define a few classes so we can mock responses from the inference API.


@dataclass
class MockDelta:
    content: str


@dataclass
class MockChoice:
    delta: MockDelta
    index: int
    finish_reason: str


@dataclass
class MockResponse:
    choices: list[MockChoice]


# Then, we set up a test database. We use an in-memory SQLite database for testing.
@pytest.fixture(name="session")
def initialize_test_database():
    # Set up the test database before each test
    # Create a test database for testing
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create tables in the test database
    SQLModel.metadata.create_all(test_engine)
    yield Session(test_engine)
    # Clean up the test database after each test
    SQLModel.metadata.drop_all(test_engine)


# And we set up a test client for the FastAPI app.
@pytest.fixture(name="client")
def get_client(session: Session):
    # Create a TestClient
    client = TestClient(app)

    # Here we also override the get_db dependency to use the test database.
    def override():
        return session

    app.dependency_overrides[get_db] = override
    return client


# Basic tests: Check we can create a new user and conversation.
def test_new_user(client: TestClient):
    response = client.post("/api/new_user")
    assert response.status_code == 200
    assert "id" in response.json()


def test_new_conversation(client: TestClient):
    # Create a new user
    user_response = client.post("/api/new_user")
    user_id = user_response.json()["id"]

    # Create a new conversation
    conversation_response = client.post("/api/new_conversation", json={"id": user_id})
    assert conversation_response.status_code == 200
    assert "id" in conversation_response.json()
    assert conversation_response.json()["messages"] == []


# Slightly more complex: Test the chat endpoint.
# We mock a streaming response, and check we receive the correct chunks.
def test_chat(mocker, client: TestClient):
    # Mock the OpenAI client
    mock_openai = mocker.patch("tacheles_backend.api.routes.client")

    # Create a new user
    user_response = client.post("/api/new_user")
    user_id = user_response.json()["id"]

    # Create a new conversation
    conversation_response = client.post("/api/new_conversation", json={"id": user_id})
    conversation_id = conversation_response.json()["id"]

    # Send a chat message
    message = {"role": "user", "content": "Hello"}
    mock_openai.chat.completions.create.return_value = iter(
        [
            MockResponse(
                choices=[
                    MockChoice(
                        delta=MockDelta(content="Hello"), index=0, finish_reason=None
                    )
                ]
            ),
            MockResponse(
                choices=[
                    MockChoice(
                        delta=MockDelta(content=" there!"),
                        index=0,
                        finish_reason="stop",
                    )
                ]
            ),
        ]
    )

    chat_response = client.post(
        "/api/chat",
        json={
            "conversation_id": conversation_id,
            "role": message["role"],
            "content": message["content"],
        },
    )

    assert chat_response.status_code == 200

    # Parse the JSON-encoded chunks and concatenate the content
    content = ""
    for chunk in chat_response.iter_lines():
        chunk_data = json.loads(chunk)
        if chunk_data["type"] == "content":
            content += chunk_data["data"]

    assert "Hello there!" == content


# No we check that we can get the list of conversations and messages.
# For these we first create conversations / messages, and then check we
# can retrieve them.
def test_get_conversations(client: TestClient):
    user_id = client.post("/api/new_user").json()["id"]
    conversation1 = client.post("/api/new_conversation", json={"id": user_id}).json()
    conversation2 = client.post("/api/new_conversation", json={"id": user_id}).json()

    response = client.get(f"/api/conversations/{user_id}")
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["id"] == conversation1["id"]
    assert response.json()[1]["id"] == conversation2["id"]


def test_get_conversation_messages(client: TestClient, mocker):
    # Mock the OpenAI client
    mock_openai = mocker.patch("tacheles_backend.api.routes.client")

    # Create a new user
    user_response = client.post("/api/new_user")
    user_id = user_response.json()["id"]

    # Create a new conversation
    conversation_response = client.post("/api/new_conversation", json={"id": user_id})
    conversation_id = conversation_response.json()["id"]

    # Send a chat message
    message = {"role": "user", "content": "Hello"}
    mock_openai.chat.completions.create.return_value = iter(
        [
            MockResponse(
                choices=[
                    MockChoice(
                        delta=MockDelta(content="Hello there!"),
                        index=0,
                        finish_reason=None,
                    )
                ]
            ),
        ]
    )

    client.post(
        "/api/chat",
        json={
            "conversation_id": conversation_id,
            "role": message["role"],
            "content": message["content"],
        },
    )

    response = client.get(f"/api/conversations/{conversation_id}/messages")
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["content"] == "Hello"
    assert response.json()[1]["content"] == "Hello there!"
