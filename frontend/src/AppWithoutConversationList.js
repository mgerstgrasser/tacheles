import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Alert, Spin } from 'antd';
import ChatInterface from './ChatInterface';
import { fetchUserId, newConversation } from './api';

// This is the entry point for the application, using the ChatInterface component.
// This needs a little bit more logic than the version with the conversation list,
// because ChatInterface is intentionally not entirely self-contained. (E.g., we would
// not want to fetch a new user ID and conversation every time the component is re-rendered.)
function App() {
  const setupRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { Header, Content, Footer } = Layout;
  const { Title } = Typography;

  useEffect(() => {
    if (setupRef.current) return;

    const setup = async () => {
      try {
        const newUserId = await fetchUserId();
        setUserId(newUserId);
        const { conversationId, messages } = await newConversation(newUserId);
        setConversationId(conversationId);
        setMessages(messages);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    setup();
    setupRef.current = true;
  }, []);

  const handleNewConversation = async () => {
    try {
      const newConversationData = await newConversation(userId);
      setConversationId(newConversationData.conversationId);
      setMessages(newConversationData.messages);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout className="app-layout">
      <Header>
        <Title level={3} style={{ color: 'white' }}>
          tacheles
        </Title>
      </Header>
      <Content className="app-content" style={{ padding: '20px ' }}>
        {isLoading ? (
          <Spin size="large" />
        ) : error ? (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ margin: '16px' }}
          />
        ) : (
          <ChatInterface
            conversationId={conversationId}
            messages={messages}
            setMessages={setMessages}
            onNewConversation={handleNewConversation}
          />
        )}
      </Content>
      <Footer className="app-footer">tacheles - a blueprint for building scalable LLM apps.</Footer>
    </Layout>
  );
}

export default App;
