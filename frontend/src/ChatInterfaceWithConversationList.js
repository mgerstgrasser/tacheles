import './ChatInterfaceWithConversationList.css';

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Spin, Alert } from 'antd';
import ChatInterface from './ChatInterface';
import { fetchUserId, newConversation, fetchConversations, fetchConversationMessages } from './api';

const { Sider, Content } = Layout;

// This component wraps around ChatInterface, and adds a menu for selecting conversations.
// This way the user can keep track of previous interactions and go back to them.
// We also put all setup logic inside this component, so that it can be self-contained.
// (It's less likely to be used in a way where this would be an issue, but it could also
// easily be moved outside the component.)
export default function ChatInterfaceWithConversationList() {
  const setupRef = useRef(false);
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup code. This runs once when the component is mounted.
  // We use a useRef here to make sure that this never runs twice, even if
  // e.g., the first render is interrupted by a re-render.
  useEffect(() => {
    if (setupRef.current) return;

    const setup = async () => {
      try {
        const newUserId = await fetchUserId();
        setUserId(newUserId);
        const initialConversation = await newConversation(newUserId);
        setSelectedConversationId(initialConversation.conversationId);
        setMessages(initialConversation.messages);
        await updateConversations(newUserId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    setup();
    setupRef.current = true;
  }, []);

  // Fetches the list of conversations for the user and updates the menu.
  const updateConversations = async (userId) => {
    try {
      const conversationList = await fetchConversations(userId);
      setConversations(conversationList);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handles the user clicking on a conversation in the menu.
  const handleConversationClick = async (conversationId) => {
    // If the user clicks the conversation they're already viewing, we don't need to do anything.
    // In fact, we don't want to do anything, as re-mounting the ChatInterface could interrupt
    // a streaming response.
    if (conversationId === selectedConversationId) return;
    setLoading(true);
    try {
      const conversationMessages = await fetchConversationMessages(conversationId);
      setSelectedConversationId(conversationId);
      setMessages(conversationMessages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Starts a new conversation.
  const handleNewConversation = async () => {
    setLoading(true);
    try {
      const newConversationData = await newConversation(userId);
      setSelectedConversationId(newConversationData.conversationId);
      setMessages(newConversationData.messages);
      await updateConversations(userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // The menu items: a list of conversations and a button to start a new one.
  const menuItems = [
    ...conversations.map((conversation) => ({
      key: conversation.id.toString(),
      label: `Conversation ${conversation.id}`,
      onClick: () => handleConversationClick(conversation.id),
    })),
    {
      key: 'new',
      label: 'New Conversation',
      onClick: handleNewConversation,
      danger: true,
      role: 'button',
    },
  ];

  return (
    <Layout>
      <Sider width={250} className="conversation-sider" breakpoint="lg" collapsedWidth="0">
        <Menu
          mode="inline"
          selectedKeys={[selectedConversationId?.toString()]}
          className="conversation-list"
          items={menuItems}
        />
      </Sider>
      <Content className="chat-interface-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert
            message="Ooops, something went wrong."
            description={error}
            type="error"
            showIcon
            style={{ margin: '20px' }}
          />
        ) : (
          <ChatInterface
            conversationId={selectedConversationId}
            messages={messages}
            setMessages={setMessages}
          />
        )}
      </Content>
    </Layout>
  );
}
