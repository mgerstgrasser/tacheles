import './App.css';
import React from 'react';
import { Layout, Typography } from 'antd';
import ChatInterfaceWithConversationList from './ChatInterfaceWithConversationList';

// This is the entry point for the application, using the ChatInterfaceWithConversationList component.
function App() {
  const { Header, Content, Footer } = Layout;
  const { Title } = Typography;

  return (
    <Layout className="app-layout">
      <Header>
        <Title level={3} style={{ color: 'white' }}>
          tacheles
        </Title>
      </Header>
      <Content className="app-content">
        <ChatInterfaceWithConversationList />
      </Content>
      <Footer className="app-footer">tacheles - a blueprint for building scalable LLM apps.</Footer>
    </Layout>
  );
}

export default App;
