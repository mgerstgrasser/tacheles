// We get the backend URL at build time through an environment variable.
// If this isn't set, we default to the URL the frontend is served from.
// Set this environment variable if you build the frontend manually through `npm run build`.
const backend_URL = process.env.REACT_APP_BACKEND_URL ? process.env.REACT_APP_BACKEND_URL : '';

// In the rest of the file we define functions that interact with each of the backend API endpoints.
// We use the Fetch API to communicate with the backend.
export const fetchUserId = async () => {
  try {
    const response = await fetch(`${backend_URL}/api/new_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // We include credentials in the request to allow the backend to set cookies in the client.
      // This is used for some basic session management.
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(
        `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: Error ${response.status} on /api/new_user]`
      );
    }
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error fetching user ID:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/new_user]`
    );
  }
};

export const newConversation = async (userId) => {
  try {
    const response = await fetch(`${backend_URL}/api/new_conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ id: userId }),
    });
    if (!response.ok) {
      throw new Error(
        `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: Error ${response.status} on /api/new_conversation]`
      );
    }
    const data = await response.json();
    return {
      conversationId: data.id,
      messages: data.messages,
    };
  } catch (error) {
    console.error('Error starting new conversation:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/new_conversation]`
    );
  }
};

export const sendMessage = async (message, signal) => {
  try {
    const response = await fetch(`${backend_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal,
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error(
        `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: Error ${response.status} on /api/chat]`
      );
    }
    // Here, we directly return a ReadableStream from the response body, for streaming responses.
    return response.body.getReader();
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/chat]`
    );
  }
};

export const fetchConversations = async (userId) => {
  try {
    const response = await fetch(`${backend_URL}/api/conversations/${userId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(
        `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: Error ${response.status} on /api/conversations/${userId}]`
      );
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/conversations/${userId}]`
    );
  }
};

export const fetchConversationMessages = async (conversationId) => {
  try {
    const response = await fetch(`${backend_URL}/api/conversations/${conversationId}/messages`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(
        `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: Error ${response.status} on /api/conversations/${conversationId}/messages]`
      );
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/conversations/${conversationId}/messages]`
    );
  }
};
