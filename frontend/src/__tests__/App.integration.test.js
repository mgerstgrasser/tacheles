import React from 'react';
import { ReadableStream } from 'web-streams-polyfill';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../AppWithConversationList';
import {
  fetchUserId,
  newConversation,
  sendMessage,
  fetchConversations,
  fetchConversationMessages,
} from '../api';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// An integration test for the entire app.
// This tests a variety of functionality such as creating new conversations,
// sending messages, and switching between conversations.
// API calls to the backend are mocked.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)

jest.mock('../api');

describe('Integration Tests for ChatInterfaceWithConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends a message and receives a response', async () => {
    fetchUserId.mockResolvedValue(1);
    newConversation.mockResolvedValue({
      conversationId: 1,
      messages: [],
    });

    const sendMessageMock = jest.fn().mockImplementation(() => {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"type":"content","data":"Hello!"}\n'));
          controller.close();
        },
      }).getReader();
    });

    sendMessage.mockImplementation(sendMessageMock);

    fetchConversations.mockResolvedValue([{ id: 1, user_id: 1 }]);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText('Type your message here...');
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'Hello, how are you?' } });
    });
    await act(async () => {
      expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledTimes(1);
      expect(sendMessageMock).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'Hello, how are you?',
          conversation_id: 1,
        },
        expect.any(AbortSignal)
      );
    });

    expect(await screen.findByText('You')).toBeInTheDocument();
    expect(await screen.findByText('Hello, how are you?')).toBeInTheDocument();

    await waitFor(
      async () => {
        expect(await screen.findByText('Assistant')).toBeInTheDocument();
        expect(await screen.findByText('Hello!')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  test('creates a new conversation', async () => {
    fetchUserId.mockResolvedValue(456);
    fetchConversations.mockResolvedValue([
      { id: 1, user_id: 1 },
      { id: 2, user_id: 1 },
    ]);
    newConversation.mockResolvedValue({
      conversationId: 789,
      messages: [],
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Conversation 2')).toBeInTheDocument();
    });

    expect(newConversation).toHaveBeenCalledTimes(1);

    fetchConversations.mockResolvedValue([
      { id: 1, user_id: 1 },
      { id: 2, user_id: 1 },
      { id: 3, user_id: 1 },
    ]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Conversation' }));
    });

    await waitFor(() => {
      expect(newConversation).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('Conversation 3')).toBeInTheDocument();
    });
  });

  test('switches between conversations', async () => {
    fetchUserId.mockResolvedValue(456);
    fetchConversations.mockResolvedValue([
      { id: 1, user_id: 1 },
      { id: 2, user_id: 1 },
    ]);
    newConversation.mockResolvedValue({
      conversationId: 1,
      messages: [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi!' },
      ],
    });

    const fetchConversationMessagesMock = jest.fn().mockImplementation((conversationId) => {
      if (conversationId === 1) {
        return [
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi!' },
        ];
      } else if (conversationId === 2) {
        return [
          { role: 'user', content: 'Salut!' },
          { role: 'assistant', content: 'Bonjour!' },
        ];
      }
    });

    fetchConversationMessages.mockImplementation(fetchConversationMessagesMock);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Conversation 2')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Conversation 2'));
    });

    await waitFor(() => {
      const conversation2 = screen.getByText('Conversation 2').closest('li');
      const conversation1 = screen.getByText('Conversation 1').closest('li');
      expect(conversation2).toHaveClass('ant-menu-item-selected');
      expect(conversation1).not.toHaveClass('ant-menu-item-selected');
    });
    await waitFor(() => {
      expect(screen.getByText('Salut!')).toBeInTheDocument();
      expect(screen.getByText('Bonjour!')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Conversation 1'));
    });

    await waitFor(() => {
      const conversation1 = screen.getByText('Conversation 1').closest('li');
      const conversation2 = screen.getByText('Conversation 2').closest('li');
      expect(conversation1).toHaveClass('ant-menu-item-selected');
      expect(conversation2).not.toHaveClass('ant-menu-item-selected');
    });
    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi!')).toBeInTheDocument();
    });
  });

  // Add more integration tests for different scenarios
});
