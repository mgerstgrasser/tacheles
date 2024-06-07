from typing import List, Optional

from pydantic import BaseModel
from sqlmodel import TEXT, Column, Field, Relationship, SQLModel

# Here we define the database schema using SQLModel.
# You can think of the following classes as a sort of "dataclass" that automagically
# gets transformed into a database schema. They're also used for data validation and
# even some data transforms (e.g., returning messages as part of a conversation) in
# the API routes.


# A conversation, identified by a unique ID, and linking back to a user, and a
# list of messages. We also define a to_dict() method which allows us to convert
# a conversation to a list of messages that we can directly feed into the OpenAI API.
class Conversation(SQLModel, table=True):
    """
    A conversation identified by a unique ID.
    List of messages is backpopulated.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    messages: List["Message"] = Relationship(back_populates="conversation")
    user: Optional["User"] = Relationship(back_populates="conversations")

    def to_list(self):
        """Convert a conversation to a list of messages."""
        return [message.to_dict() for message in self.messages]


class User(SQLModel, table=True):
    """A single user identified by a unique ID."""

    id: Optional[int] = Field(default=None, primary_key=True)
    conversations: List[Conversation] = Relationship(back_populates="user")


class Message(SQLModel, table=True):
    """
    A single message.
    Linked back to the conversation through an ID.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    role: str
    content: str = Field(sa_column=Column(TEXT))
    conversation: Optional[Conversation] = Relationship(back_populates="messages")

    def to_dict(self):
        """Convert a message to a dict."""
        return {"role": self.role, "content": self.content}


# The following sets up a nice feature of FastAPI/SQLModel, where we can tell FastAPI
# what data exactly to include or exclude in the response it sends to the client.
# Here, we tell it that we'd like it to add the list of messages to the response,
# instead of just returning the conversation ID.
class ConversationWithMessagesList(BaseModel):
    """
    A conversation identified by a unique ID, with messages included as a list.
    This duplicates the Conversation type, and is needed so that FastAPI
    includes the list of messages in the return value.
    """

    id: int
    messages: List[Message] = []
