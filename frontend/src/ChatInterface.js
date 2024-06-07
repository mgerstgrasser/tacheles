import './ChatInterface.css';
import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import UserInput from './UserInput';
import PropTypes from 'prop-types';
import { sendMessage } from './api';
import { Alert } from 'antd';

// This is the main ChatInterface component.
// It uses MessageList and UserInput to display a basic chat UI.
// The main thing implemented here is sending and receiving messages,
// and in particular handling streaming responses. (As well as aborting
// the streaming response handling when necessary.)
export default function ChatInterface({
  conversationId,
  messages,
  setMessages,
  onNewConversation,
}) {
  const [inputEnabled, setInputEnabled] = useState(true);
  const [abortController, setAbortController] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This effect cleans up the AbortController when the component is unmounted.
    // E.g., if the user navigates away from the current conversation, this stops
    // us from receiving more chunks, and also from trying to update the last message
    // of what is now a different conversation.
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const handleSendMessage = async (messageText) => {
    // First, we disable the Send Message button, so that the user
    // cannot send multiple messages at once. If two copies of this
    // function were running concurrently, bad things would happen.
    setInputEnabled(false);
    try {
      const userMessage = {
        role: 'user',
        content: messageText,
        conversation_id: conversationId,
      };

      // First, we append the user's message to the list of messages,
      // so it's shown in the UI immediately.
      setMessages((prevMessages) => [...prevMessages, userMessage]);

      // Then, we send the message to the backend. We set up an AbortController
      // so that we can cancel the request if necessary.
      const controller = new AbortController();
      setAbortController(controller);
      const stream = await sendMessage(userMessage, controller.signal);

      const decoder = new TextDecoder('utf-8');

      // Then, we start with an empty string for the AI assistant's message,
      // which we can then add chunks to as we receive them.
      let botMessageText = '';

      // We read from the stream in a loop, until we reach the end of the stream.
      // Just to be safe, we also limit the number of iterations to 10 million.
      for (let i = 0; i < 10000000; i++) {
        const { done, value } = await stream.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');
        // Responses are streamed as "ndjson" (newline-delimited JSON).
        // So we parse each line individual as JSON.
        for (const line of lines) {
          const message = JSON.parse(line);
          if (message.type === 'content') {
            // If the message is a content message, we add the data to the
            // botMessageText string.
            botMessageText += message.data;
            const botMessage = {
              role: 'assistant',
              content: botMessageText,
            };
            // Then we append the bot's message to the list of messages,
            // so it's shown in the UI. Due to how React works, we need to
            // pop the last message off the list, update it, and then push
            // it back on. This is because we can't directly modify the last
            // message in the list.
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages];
              const lastMessage = newMessages.pop();
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = botMessageText;
                newMessages.push(lastMessage);
              } else {
                newMessages.push(lastMessage, botMessage);
              }
              return newMessages;
            });
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error in handleSendMessage:', error);
        setError(error.message);
      }
    } finally {
      // Finally, we clean up by resetting the AbortController and re-enabling
      // the Send Message button.
      setAbortController(null);
      setInputEnabled(true);
    }
  };

  const handleNewConversation = async () => {
    // Optionally, the component can also handle creating a new conversation.
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    onNewConversation && onNewConversation();
  };

  return (
    <div className="chat-interface">
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ margin: '20px' }}
        />
      )}
      <MessageList messages={messages} />

      <UserInput
        sendMessage={handleSendMessage}
        resetConversation={onNewConversation && handleNewConversation}
        inputEnabled={inputEnabled}
        focusOnMount={messages.length === 0}
      />
    </div>
  );
}

ChatInterface.propTypes = {
  conversationId: PropTypes.number.isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string,
      content: PropTypes.string,
    })
  ).isRequired,
  setMessages: PropTypes.func.isRequired,
  onNewConversation: PropTypes.func,
};
