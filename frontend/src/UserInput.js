import React, { useEffect, useState } from 'react';
import { Button, Input } from 'antd';
import PropTypes from 'prop-types';
import './UserInput.css';

// This shows the user input field and the "Send Message" button.
// It also includes a "New Conversation" button, if the resetConversation prop is provided.
// The latter can be useful if using ChatInterface standalone, but is disabled when using
// the ChatInterfaceWithConversationList component, which has its own "New Conversation" button.
export default function UserInput({
  sendMessage,
  resetConversation,
  inputEnabled = true,
  focusOnMount = true,
}) {
  const [messageInput, setMessageInput] = useState('');
  const [isSendDisabled, setIsSendDisabled] = useState(true);

  useEffect(() => {
    // Focus on the input field when the component is mounted, but only
    // optionally. (We make this optional because we might not want to
    // do this if we load a long conversation history, for example.)
    if (focusOnMount) {
      document.querySelector('.userinput-textfield').focus();
    }
  }, []);

  useEffect(() => {
    // Disable the "Send Message" button if the text input is empty
    setIsSendDisabled(messageInput === '');
  }, [messageInput]);

  return (
    <div className="userinput">
      <Input.TextArea
        rows={4}
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        // If user presses Enter, send the message; but not for shift-enter etc.
        // And also not if the send button is disabled, or if the input is empty.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            if (inputEnabled && !isSendDisabled) {
              sendMessage(messageInput);
              setMessageInput('');
            }
          }
        }}
        className="userinput-textfield"
        placeholder="Type your message here..."
        aria-label="Message input"
      />
      <div className="userButtons">
        <Button
          onClick={() => {
            sendMessage(messageInput);
            setMessageInput('');
          }}
          className="userinput-button"
          disabled={!inputEnabled || isSendDisabled}
          aria-label="Send Message"
        >
          Send Message
        </Button>
        {resetConversation && (
          <Button
            onClick={resetConversation}
            className="userinput-button"
            aria-label="New Conversation"
          >
            New Conversation
          </Button>
        )}
      </div>
    </div>
  );
}

UserInput.propTypes = {
  sendMessage: PropTypes.func.isRequired,
  resetConversation: PropTypes.func,
  inputEnabled: PropTypes.bool,
  focusOnMount: PropTypes.bool,
};
