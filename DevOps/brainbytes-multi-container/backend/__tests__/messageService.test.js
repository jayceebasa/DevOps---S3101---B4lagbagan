const messageService = require('../services/messageService');
const db = require('../db');

jest.mock('../db');

describe('Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveMessage calls database with correct data', async () => {
    db.saveMessage.mockResolvedValueOnce({ insertedId: '123' });

    const message = { text: 'Test message', sender: 'user' };
    await messageService.saveMessage(message);

    expect(db.saveMessage).toHaveBeenCalledWith(message);
    expect(db.saveMessage).toHaveBeenCalledTimes(1);
  });

  test('getMessagesBySession returns messages from database', async () => {
    const mockMessages = [
      { text: 'Hello', sender: 'user' },
      { text: 'Hi there', sender: 'ai' },
    ];

    db.getMessagesBySession.mockResolvedValueOnce(mockMessages);

    const result = await messageService.getMessagesBySession('test-session');

    expect(result).toEqual(mockMessages);
    expect(db.getMessagesBySession).toHaveBeenCalledWith('test-session');
  });
});