import { Language } from '@logto/schemas';
import { NotFoundError } from 'slonik';

import translationRoutes from '@/routes/translation';
import { createRequester } from '@/utils/test-utils';

const enUsTranslation = {
  input: {
    username: 'Username',
    password: 'Password',
    email: 'Email',
    phone_number: 'Phone number',
    confirm_password: 'Confirm password',
  },
};

const mockLanguages: Record<string, Language> = {
  'en-US': {
    key: 'en-US',
    translation: enUsTranslation,
  },
};

const findLanguageByKey = jest.fn(async (key: string) => {
  const mockLanguage = mockLanguages[key];

  if (!mockLanguage) {
    throw new NotFoundError();
  }

  return mockLanguage;
});

jest.mock('@/queries/language', () => ({
  findLanguageByKey: async (key: string) => findLanguageByKey(key),
}));

describe('translationRoutes', () => {
  const translationRequest = createRequester({ authedRoutes: translationRoutes });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /translations/:languageKey', () => {
    it('should call findLanguageByKey once', async () => {
      const languageKey = 'en-US';
      const response = await translationRequest.get(`/translations/${languageKey}`);
      expect(findLanguageByKey).toBeCalledTimes(1);
    });

    it('should return custom translation when there is a specified language in the database', async () => {
      const languageKey = 'en-US';
      const response = await translationRequest.get(`/translations/${languageKey}`);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(enUsTranslation);
    });

    it('should return empty translation when there is no specified language in the database', async () => {
      const languageKey = 'en-AU';
      const response = await translationRequest.get(`/translations/${languageKey}`);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({});
    });
  });
});
