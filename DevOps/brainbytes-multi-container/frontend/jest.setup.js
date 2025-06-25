import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

// Mock relative URLs for fetch
fetchMock.mockIf(/^\/api\/.*/, (req) => {
  if (req.url === '/api/chat/send') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          body: JSON.stringify({
            userMessage: { text: 'Hello' },
            aiMessage: { text: 'Hi there' },
          }),
        });
      }, 100); // Simulate a 100ms delay
    });
  }
  return Promise.reject(new Error(`Unhandled request: ${req.url}`));
});