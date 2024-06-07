import React from 'react';
import { ReadableStream } from 'web-streams-polyfill';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../AppWithoutConversationList';
import { fetchUserId, newConversation, sendMessage } from '../api';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// An integration test for the entire app, without conversation list.
// This tests a variety of functionality such as creating new conversations,
// sending messages, and switching between conversations.
// API calls to the backend are mocked.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)

jest.mock('../api');

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends a message and receives a response', async () => {
    fetchUserId.mockResolvedValue(456);
    newConversation.mockResolvedValue({
      conversationId: 123,
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
          conversation_id: 123,
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

  // Add more integration tests for different scenarios
});
