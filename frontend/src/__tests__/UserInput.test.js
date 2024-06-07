import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import UserInput from '../UserInput';
import { jest, describe, test, expect } from '@jest/globals';

// This tests the UserInput component, mainly enabling and disabling input and buttons.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)
describe('UserInput', () => {
  test('renders input and buttons', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} />);

    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByText('Send Message')).toBeInTheDocument();
    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  test('enables input and buttons when inputEnabled is true', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} inputEnabled={true} />);

    fireEvent.change(screen.getByPlaceholderText('Type your message here...'), {
      target: { value: 'Hello' },
    });

    expect(screen.getByPlaceholderText('Type your message here...')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'New Conversation' })).toBeEnabled();
  });

  test('disables input and send button when inputEnabled is false', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} inputEnabled={false} />);

    fireEvent.change(screen.getByPlaceholderText('Type your message here...'), {
      target: { value: 'Hello' },
    });

    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled();
  });

  test('calls sendMessage when Send button is clicked', () => {
    const sendMessageMock = jest.fn();
    render(<UserInput sendMessage={sendMessageMock} resetConversation={() => {}} />);

    const messageInput = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send Message');

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith('Hello');
  });

  test('calls resetConversation when New Conversation button is clicked', () => {
    const resetConversationMock = jest.fn();
    render(<UserInput sendMessage={() => {}} resetConversation={resetConversationMock} />);

    const resetButton = screen.getByText('New Conversation');

    fireEvent.click(resetButton);

    expect(resetConversationMock).toHaveBeenCalledTimes(1);
  });

  test('clears input after sending a message', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} />);

    const messageInput = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send Message');

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    expect(messageInput).toHaveValue('');
  });

  test('disables Send Message button when input is empty', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} />);

    const messageInput = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByRole('button', { name: 'Send Message' });

    // Initially, the input is empty, so the Send Message button should be disabled
    expect(sendButton).toBeDisabled();

    // Type a message into the input
    fireEvent.change(messageInput, { target: { value: 'Hello' } });

    // The Send Message button should now be enabled
    expect(sendButton).toBeEnabled();

    // Clear the input
    fireEvent.change(messageInput, { target: { value: '' } });

    // The Send Message button should be disabled again
    expect(sendButton).toBeDisabled();
  });

  test('does not render New Conversation button when resetConversation is not provided', () => {
    render(<UserInput sendMessage={() => {}} />);

    expect(screen.queryByText('New Conversation')).not.toBeInTheDocument();
  });

  test('renders New Conversation button when resetConversation is provided', () => {
    render(<UserInput sendMessage={() => {}} resetConversation={() => {}} />);

    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  test('calls resetConversation when New Conversation button is clicked', () => {
    const resetConversationMock = jest.fn();
    render(<UserInput sendMessage={() => {}} resetConversation={resetConversationMock} />);

    const resetButton = screen.getByText('New Conversation');

    fireEvent.click(resetButton);

    expect(resetConversationMock).toHaveBeenCalledTimes(1);
  });

  test('sends message when Enter key is pressed', () => {
    const sendMessageMock = jest.fn();
    render(<UserInput sendMessage={sendMessageMock} />);

    const messageInput = screen.getByPlaceholderText('Type your message here...');

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.keyDown(messageInput, { key: 'Enter', code: 13, charCode: 13 });

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith('Hello');
  });

  test('does not send message when Enter key is pressed with modifier keys', () => {
    const sendMessageMock = jest.fn();
    render(<UserInput sendMessage={sendMessageMock} />);

    const messageInput = screen.getByPlaceholderText('Type your message here...');

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.keyDown(messageInput, { key: 'Enter', code: 13, charCode: 13, shiftKey: true });

    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
