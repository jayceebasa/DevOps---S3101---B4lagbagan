import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Chat from '../components/Chat';

beforeEach(() => {
  fetch.resetMocks();
});

test('shows loading indicator while waiting for response', async () => {
  fetch.mockImplementationOnce(() =>
    new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              userMessage: { text: 'Hello' },
              aiMessage: { text: 'Hi there' },
            }),
        });
      }, 100) // Simulate a 100ms delay
    )
  );

  render(<Chat />);

  const input = screen.getByPlaceholderText(/type your question/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  const button = screen.getByRole('button', { name: /send/i });

  await act(async () => {
    fireEvent.click(button);
  });

  // Wait for the loading indicator to appear
  await waitFor(() => {
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Wait for the loading indicator to disappear
  await waitFor(() => {
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });
});