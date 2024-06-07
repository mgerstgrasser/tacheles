import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, test, expect } from '@jest/globals';
import MessageList from '../MessageList';

// This tests the MessageList component, including markdown rendering.
// Like all of these tests, they take the form of simulating a series of user
// inputs, and then checking that some expected conditions for the UI
// state are met. (E.g. certain text is present.)
// We also test the copy code functionality, checking that the function used to
// do this in the browser is called with the expected arguments.
describe('MessageList', () => {
  test('renders messages correctly', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    render(<MessageList messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  test('renders code blocks correctly', async () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Here is some code:\n```\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n```',
      },
    ];

    render(<MessageList messages={messages} />);

    expect(await screen.findByText(/function greet/)).toBeInTheDocument();
    expect(await screen.findByText(/console.log/)).toBeInTheDocument();
    expect(await screen.findByText(/}/)).toBeInTheDocument();
  });

  test('copies code to clipboard when "Copy Code" button is clicked', async () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Here is some code:\n```\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n```',
      },
    ];

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    render(<MessageList messages={messages} />);

    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'function greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n'
      );
    });
  });
});
