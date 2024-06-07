import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../AppWithConversationList';
import * as api from '../api';
import axios from 'axios';
import { jest, describe, test, expect } from '@jest/globals';

// An **end-to-end** integration test for the entire app. Unlike the tests in
// the __tests__ directory, this test is designed to run against the real
// Python backend. You can run this locally if the backend is running with the
// mock inference API, or you can run it in the CI pipeline on github actions
// to test in a docker-compose setup. If running locally, you need to set the
// REACT_APP_BACKEND_URL environment variable to the URL of the backend.

// Similarly to the frontend-only tests this simulates user inputs and checks
// that the UI is in the expected state after each step.

// Because the mock inference backend streams responses relatively slowly, this
// test can take a while to run. 60s should be enough time for the test to pass,
// but if you ever add more tests or encounter unexpected failures due to timeout,
// you may need to increase the timeout value.
jest.setTimeout(60000);

// Finally, the `fetch` implementation in the test environment doesn't handle
// streaming responses at all, so we need to replace it with an axios implementation.
// This still hits the real backend, though.
const sendMessageAxios = async (message, signal) => {
  try {
    const response = await axios.post(`http://localhost:8001/api/chat`, message, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      signal,
      responseType: 'stream',
    });

    const lines = response.data.trim().split('\n');
    let index = 0;

    const reader = {
      read: async () => {
        if (index >= lines.length) {
          return { done: true };
        }

        const line = lines[index];
        index++;

        return {
          value: new TextEncoder().encode(line + '\n'),
          done: false,
        };
      },
    };

    return reader;
  } catch (error) {
    if (error.name === 'AbortError') {
      return { done: true };
    }
    console.error('Error sending message:', error);
    throw new Error(
      `We've encountered an error when trying to communicate with our backend. It's probably not you, it's us. Please try again later. [Technical details: ${error} on /api/chat]`
    );
  }
};

describe('Integration Tests for ChatInterfaceWithConversationList', () => {
  test('sends a message and receives a response', async () => {
    jest.spyOn(api, 'sendMessage');
    api.sendMessage.mockImplementation(sendMessageAxios);

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

    expect(await screen.findByText('You')).toBeInTheDocument();
    expect(await screen.findByText('Hello, how are you?')).toBeInTheDocument();

    await waitFor(
      async () => {
        expect(await screen.findByText('Assistant')).toBeInTheDocument();
        expect(
          await screen.findByText(/This is tacheles, a blueprint for LLM chat applications./)
        ).toBeInTheDocument();
      },
      { timeout: 30000 }
    );
  });

  test('creates new conversations and switches between them', async () => {
    jest.spyOn(api, 'sendMessage');
    api.sendMessage.mockImplementation(sendMessageAxios);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    });

    // Send a message in the first conversation
    let messageInput = screen.getByPlaceholderText('Type your message here...');
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'Hello, how are you?' } });
    });
    await act(async () => {
      expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    });

    expect(await screen.findByText('You')).toBeInTheDocument();
    expect(await screen.findByText('Hello, how are you?')).toBeInTheDocument();

    await waitFor(
      async () => {
        expect(await screen.findByText('Assistant')).toBeInTheDocument();
        expect(
          await screen.findByText(/This is tacheles, a blueprint for LLM chat applications./)
        ).toBeInTheDocument();
      },
      { timeout: 30000 }
    );

    // Start a new conversation
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Conversation' }));
    });

    // Wait for the new conversation to appear in the list
    await waitFor(() => {
      const conversationItems = screen.getAllByRole('menuitem');
      expect(conversationItems.length).toBe(2);
    });

    // Send a message in the second conversation
    messageInput = screen.getByPlaceholderText('Type your message here...');
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'How can I assist you today?' } });
    });
    await act(async () => {
      expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    });

    expect(await screen.findByText('You')).toBeInTheDocument();
    expect(await screen.findByText('How can I assist you today?')).toBeInTheDocument();

    await waitFor(
      async () => {
        expect(await screen.findByText('Assistant')).toBeInTheDocument();
        expect(
          await screen.findByText(/This is tacheles, a blueprint for LLM chat applications./)
        ).toBeInTheDocument();
      },
      { timeout: 30000 }
    );

    // Switch back to the first conversation
    const conversationItems = screen.getAllByRole('menuitem');
    await act(async () => {
      fireEvent.click(conversationItems[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.queryByText('How can I assist you today?')).not.toBeInTheDocument();
    });

    // Switch to the second conversation again
    await act(async () => {
      fireEvent.click(conversationItems[1]);
    });

    await waitFor(() => {
      expect(screen.getByText('How can I assist you today?')).toBeInTheDocument();
      expect(screen.queryByText('Hello, how are you?')).not.toBeInTheDocument();
    });
  });
});
