import React from 'react';
import { ReadableStream } from 'web-streams-polyfill';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatInterface from '../ChatInterface';
import { sendMessage } from '../api';
import { jest, describe, test, expect } from '@jest/globals';

// This tests the ChatInterface component, including sending messages and receiving responses.
// API calls to the backend are mocked.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)

jest.mock('../api');

describe('ChatInterface', () => {
  test('sends a message and receives a response', async () => {
    let messagesState = [];
    const setMessagesMock = jest.fn((updateFn) => {
      if (typeof updateFn === 'function') {
        messagesState = updateFn(messagesState);
      } else {
        messagesState = updateFn;
      }
    });

    const sendMessageMock = jest.fn().mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"type":"content","data":"Hello!"}\n'));
          controller.close();
        },
      }).getReader()
    );

    sendMessage.mockImplementation(sendMessageMock);

    render(
      <ChatInterface
        userId={123}
        conversationId={456}
        messages={[]}
        setMessages={setMessagesMock}
        onNewConversation={() => {}}
      />
    );

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
          conversation_id: 456,
        },
        expect.any(AbortSignal)
      );
    });

    // Verify setMessages was called with the user message
    await waitFor(() => {
      expect(messagesState).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello, how are you?',
            conversation_id: 456,
          }),
        ])
      );
    });

    // Verify setMessages was called with the assistant message
    await waitFor(() => {
      expect(messagesState).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello, how are you?',
            conversation_id: 456,
          }),
          expect.objectContaining({
            role: 'assistant',
            content: 'Hello!',
          }),
        ])
      );
    });
  });

  test('calls onNewConversation when New Conversation button is clicked', () => {
    const onNewConversationMock = jest.fn();

    render(
      <ChatInterface
        userId={123}
        conversationId={456}
        messages={[]}
        setMessages={() => {}}
        onNewConversation={onNewConversationMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'New Conversation' }));

    expect(onNewConversationMock).toHaveBeenCalledTimes(1);
  });

  // Add more tests for ChatInterface
});
