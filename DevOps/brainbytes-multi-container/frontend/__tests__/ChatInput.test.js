import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../components/ChatInput';

test('submits message when user clicks send', () => {
  const handleSubmit = jest.fn();
  render(<ChatInput onSubmit={handleSubmit} />);

  const input = screen.getByPlaceholderText(/type your question/i);
  fireEvent.change(input, { target: { value: 'Test message' } });

  const button = screen.getByRole('button', { name: /send/i });
  fireEvent.click(button);

  expect(handleSubmit).toHaveBeenCalledWith('Test message');
  expect(input).toHaveValue('');
});

test('does not submit empty messages', () => {
  const handleSubmit = jest.fn();
  render(<ChatInput onSubmit={handleSubmit} />);

  const button = screen.getByRole('button', { name: /send/i });
  fireEvent.click(button);

  expect(handleSubmit).not.toHaveBeenCalled();
});