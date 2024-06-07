import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterfaceWithConversationList from '../ChatInterfaceWithConversationList';
import {
  fetchUserId,
  newConversation,
  fetchConversations,
  fetchConversationMessages,
} from '../api';
import { jest, describe, test, expect } from '@jest/globals';

// This tests the ChatInterfaceWithConversationList component,
// including sending messages and receiving responses.
// API calls to the backend are mocked.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)

jest.mock('../api');

describe('ChatInterfaceWithConversationList', () => {
  test('renders conversation list and chat interface', async () => {
    fetchUserId.mockResolvedValue(123);
    newConversation.mockResolvedValue({
      conversationId: 456,
      messages: [],
    });
    fetchConversations.mockResolvedValue([{ id: 456 }, { id: 789 }]);

    render(<ChatInterfaceWithConversationList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    expect(screen.getByText('Conversation 456')).toBeInTheDocument();
    expect(screen.getByText('Conversation 789')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
  });

  test('switches conversation when conversation is clicked', async () => {
    fetchUserId.mockResolvedValue(123);
    newConversation.mockResolvedValue({
      conversationId: 456,
      messages: [],
    });
    fetchConversations.mockResolvedValue([{ id: 456 }, { id: 789 }]);
    fetchConversationMessages.mockResolvedValue([{ role: 'user', content: 'Hello' }]);

    render(<ChatInterfaceWithConversationList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Conversation 789'));

    await waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledTimes(1);
      expect(fetchConversationMessages).toHaveBeenCalledWith(789);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  test('starts new conversation when New Conversation button is clicked', async () => {
    fetchUserId.mockResolvedValue(123);
    newConversation.mockResolvedValue({
      conversationId: 456,
      messages: [],
    });
    fetchConversations.mockResolvedValue([{ id: 456 }]);

    render(<ChatInterfaceWithConversationList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'New Conversation' }));

    await waitFor(() => {
      expect(newConversation).toHaveBeenCalledTimes(2);
      expect(newConversation).toHaveBeenCalledWith(123);
      expect(fetchConversations).toHaveBeenCalledTimes(2);
      expect(fetchConversations).toHaveBeenCalledWith(123);
    });
  });
});
