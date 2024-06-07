import './MessageList.css';
import { Comment } from '@ant-design/compatible';
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import gfm from 'remark-gfm';

// This component renders a list of messages, with different styles for user and assistant messages.
// It also supports rendering code blocks with syntax highlighting and copy-pasting, and markdown.
export default function MessageList({ messages }) {
  // If messages is undefined or a wrong type, we pretend it's an empty list instead.
  const messageList = Array.isArray(messages) ? messages : [];

  // This sets up how we render codeblocks with a copy-paste button.
  const CodeBlock = ({ children }) => {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
      const childrenArray = React.Children.toArray(children);
      const code = childrenArray.map((child) => child.props.children).join('\n');
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="code-block">
        <button className="copy-button" onClick={copyCode}>
          {copied ? <CheckOutlined /> : <CopyOutlined />}
        </button>
        <pre>{children}</pre>
      </div>
    );
  };

  CodeBlock.propTypes = {
    children: PropTypes.node.isRequired,
  };

  // This is the main rendering logic for the MessageList component.
  // We map over the messages and render them as Comment components from Ant Design.
  // And we use ReactMarkdown to render the message content, with support for code blocks.
  return (
    <div className="message-list">
      {messageList.map((message, index) => (
        <Comment
          className={`message ${message.role}`}
          author={message.role === 'user' ? 'You' : 'Assistant'}
          key={index}
          content={
            <div className="message-content">
              <ReactMarkdown
                components={{
                  code: ({ inline, children }) => (
                    <code className={`${inline ? 'inline-code' : 'code-block'}`}>{children}</code>
                  ),
                  pre: CodeBlock,
                }}
                remarkPlugins={[gfm]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          }
        />
      ))}
    </div>
  );
}

MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string,
      content: PropTypes.string,
    })
  ),
};
