import json
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI, OpenAIError
from sqlmodel import Session, select

from ..models.database import get_db
from ..models.models import Conversation, ConversationWithMessagesList, Message, User
from ..utils.logging import get_logger

# This file defines all the API endpoints for the backend.

# --------------------
# Setup
# --------------------

# We first set up a few things:
# First, an APIRouter. This is needed because we keep our API routes here instead
# of the main FastAPI app file, to keep things organized.
router = APIRouter()

# Then, we set up a logger.
# Have a look at utils/logger.py for details.
# For now this is just a stub that re-uses the uvicorn/FastAPI logger.
# But you could define more sophisticated logging here.
logger = get_logger(__name__)

# Finally, we set up an OpenAI library client.
# We use this even for vllm and sglang as well as the mock inference backend, as all
# of them support the same OpenAI API. However, it would be fairly simple to switch
# this out for a different library if needed, it's really only used once in chat().
# For now, we keep this here for simplicity and to not scare you away with a backend
# spread across dozens of files. However, if you were to do more sophisticated things
# here, e.g. multiple models or even different inference APIs, prompt re-writing, etc.,
# you might want to move this to a separate file similarly to the logger.
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY", "123"),
    base_url=os.environ.get("INFERENCE_API_URI", None),
)
model = os.environ.get("MODEL", "model")
system_prompt = "You are a helpful assistant."


# --------------------
# API Endpoints
# --------------------


# Now we define the actually API endpoints. The first is just a simple health check,
# which can be used (e.g., by docker compose) to see if the backend is up and running.
@router.get("/api/healthcheck", tags=["Healthcheck"])
async def healthcheck():
    """
    Health check endpoint for the backend.

    Returns:
        str: "OK" if the backend is running.
    """
    return "OK"


# This is our first "real" endpoint.
# Notice how thanks to FastAPI and SQLModel adding a new user is as simple as
# saying `db.add(user)`. SQLModel takes care of the rest. Notice also how the same
# User class is used to return the output to the client, without any additional effort
# on our part.
@router.post("/api/new_user", response_model=User, tags=["Users"])
async def new_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Create a new user and return the user ID.

    Returns:
        User: The created user object.
    """
    try:
        user = User()
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.debug(f"New user created: {user}")
        # We use a session middleware to provide some very basic security.
        # Here we store the user ID in the session, so we can check it in later
        # requests to other API endpoints.
        # If you wanted to do something more sophisticated, like letting users
        # sign up via email and password, check out FastAPI's OAuth2 support.
        request.session["user_id"] = user.id
        return user
    except Exception as e:
        # The following is a generic error handling: If we raise a HTTPException
        # elsewhere in the try block, we pass it on. For anything else, we log
        # the error and raise a 500 error.
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error creating new user: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# Note how we use the ConversationWithMessagesList response model here. This would
# allow us to return an initial list of messages when the user starts a new
# conversation. We could use this e.g., to show a welcome message, or in research
# projects where the user is given a pre-defined initial prompt, etc.
@router.post(
    "/api/new_conversation",
    response_model=ConversationWithMessagesList,
    tags=["Conversations"],
)
async def new_conversation(
    user: User, request: Request, db: Session = Depends(get_db)
) -> Conversation:
    """
    Create a new conversation for a user and return the conversation ID.

    Args:
        user (User): The user object for whom the conversation is created.

    Returns:
        Conversation: The created conversation object.
    """
    if user.id != request.session.get("user_id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        conversation = Conversation(user_id=user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        logger.debug(f"New conversation created: {conversation}")
        logger.debug(f"Conversation messages: {conversation.messages}")
        return conversation
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error creating new conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/api/chat", tags=["Chat"])
def chat(
    usermessage: Message, request: Request, db: Session = Depends(get_db)
) -> StreamingResponse:
    """
    Receive a chat message from the user, process it using an LLM,
    and return the response as a streamed text.

    Args:
        usermessage (Message): The user's chat message.

    Returns:
        StreamingResponse: The LLM-generated response, streamed as plain text.
    """
    logger.debug(
        f"New chat request: ID {usermessage.conversation_id},\
             message: {usermessage.content}"
    )

    # This is the chat endpoint that lets users send a message and receive a streaming
    # response from the LLM. Because of the token-by-token streaming, this endpoint
    # is slightly more complex than the others.

    # First, we must wrap the actual processing in a generator function that yields
    # the response in chunks. We can then later pass this function to FastAPI's
    # StreamingResponse, which will handle the streaming for us.

    def generate(db: Session):
        try:
            # First we get the conversation and do some standard checks and error
            # handling including basic authentication.
            conversation = db.get(Conversation, int(usermessage.conversation_id))
            if conversation is None:
                logger.warning(f"Conversation {usermessage.conversation_id} not found")
                raise HTTPException(status_code=404, detail="Conversation not found.")

            if conversation.user_id != request.session.get("user_id"):
                raise HTTPException(status_code=403, detail="Unauthorized")

            logger.debug(f"Conversation messages: {conversation.messages}")

            # Then, we format the user's conversation using a system prompt message,
            # the prior conversation history, and the user's current message, and
            # send it to the LLM for completion.
            try:
                completion = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": system_prompt}]
                    + conversation.to_list()
                    + [{"role": "user", "content": usermessage.content}],
                    stream=True,
                    max_tokens=2000,
                )
            except OpenAIError as e:
                logger.error(f"Error communicating with LLM backend: {str(e)}")
                raise HTTPException(
                    status_code=500, detail="Error processing chat message"
                )

            # Then, we pass on each received chunk to the client as we receive it.
            llmmessage = ""
            for chunk in completion:
                cur_message = chunk.choices[0].delta
                if cur_message.content is not None:
                    llmmessage += cur_message.content
                    response = json.dumps(
                        {"type": "content", "data": cur_message.content}
                    )
                    logger.debug(f"Sending chunk: {response}")
                    yield f"{response} \n"

            logger.debug(f"Entire message: {llmmessage}")

            # Finally, we let the client know that the response is complete.
            response = json.dumps({"type": "end", "data": ""})
            logger.debug(f"Sending chunk: {response}")
            yield f"{response} \n"

            # Afterwards, we save the user's message and the LLM's response to the
            # database, so we can use them in future requests.
            conversation.messages.append(usermessage)
            conversation.messages.append(Message(role="assistant", content=llmmessage))
            db.commit()

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error processing chat request: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal Server Error")

    return StreamingResponse(generate(db), media_type="application/x-ndjson")


@router.get(
    "/api/conversations/{user_id}",
    response_model=List[Conversation],
    tags=["Conversations"],
)
async def get_conversations(
    user_id: int, request: Request, db: Session = Depends(get_db)
):
    try:
        if user_id != request.session.get("user_id"):
            raise HTTPException(status_code=403, detail="Unauthorized")
        conversations = db.exec(
            select(Conversation).where(Conversation.user_id == user_id)
        ).all()

        # We intentionally don't handle "empty" conversations specially in general,
        # as there are many possible design choices for dealing with them. E.g.,
        # you might want to only create a conversation when the user sends the first
        # message. On the other hand, you might also source the first user message from
        # elsewhere, in which case you'd want a very different design. Or you might want
        # to auto-save drafts of user messages, including the first one, on the backend
        # so the user can come back to them later. All of these would be need different
        # design choices.

        # However, as one "quick" way of dealing with empty conversations, we could
        # filter them out here. In the following, we filter out all conversations that
        # have no messages, except the last one. (So that the last one still shows up
        # in the frontend conversation list.)

        # for conversation in conversations:
        #     conversation.messages = db.exec(
        #         select(Message).where(Message.conversation_id == conversation.id)
        #     ).all()

        # return (
        #     [
        #         conversation
        #         for conversation in conversations[:-1]
        #         if len(conversation.messages) > 0
        #     ]
        #     + [conversations[-1]]
        #     if len(conversations) > 0
        #     else []
        # )

        return conversations
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error retrieving conversations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/api/conversations/{conversation_id}/messages",
    response_model=List[Message],
    tags=["Conversations"],
)
async def get_conversation_messages(
    conversation_id: int, request: Request, db: Session = Depends(get_db)
):
    try:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        if conversation.user_id != request.session.get("user_id"):
            raise HTTPException(status_code=403, detail="Unauthorized")
        messages = db.exec(
            select(Message).where(Message.conversation_id == conversation_id)
        ).all()
        # We can't have two user messages in a row, otherwise the inference backend
        # will throw an error.
        # In theory, the last message should always be from the assistant anyway.
        # But just in case, we remove the last message if it's from the user.
        # Otherwise, the frontend might call /api/chat again with another user message.
        if len(messages) > 0 and messages[-1].role == "user":
            messages.pop()
        return messages
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error retrieving conversation messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
