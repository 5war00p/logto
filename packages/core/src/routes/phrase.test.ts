import { LanguageKeyType, Phrase } from '@logto/schemas';

import RequestError from '@/errors/RequestError';
import phraseRoutes from '@/routes/phrase';
import { createRequester } from '@/utils/test-utils';

const mockLocalizations: { [key in LanguageKeyType]?: Phrase } = {
  [LanguageKeyType.enUS]: {
    languageKey: LanguageKeyType.enUS,
    translation: {
      input: {
        username: 'Username',
        password: 'Password',
        email: 'Email',
        phone_number: 'Phone number',
        confirm_password: 'Confirm password',
      },
    },
  },
};

const findPhraseByLanguageKey = jest.fn(async (languageKey: LanguageKeyType) => {
  const mockPhrase = mockLocalizations[languageKey];

  if (!mockPhrase) {
    throw new RequestError({ code: 'entity.not_found', status: 404 });
  }

  return mockPhrase;
});

jest.mock('@/queries/phrase', () => ({
  findPhraseByLanguageKey: async (key: LanguageKeyType) => findPhraseByLanguageKey(key),
}));

describe('phraseRoutes', () => {
  const phraseRequest = createRequester({ authedRoutes: phraseRoutes });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /phrases/:languageKey', () => {
    it('should call findPhraseByLanguageKey once', async () => {
      await phraseRequest.get(`/phrases/${LanguageKeyType.enUS}`);
      expect(findPhraseByLanguageKey).toBeCalledTimes(1);
    });

    it('should return the specified phrase existing in the database', async () => {
      const response = await phraseRequest.get(`/phrases/${LanguageKeyType.enUS}`);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(mockLocalizations[LanguageKeyType.enUS]);
    });

    it('should return 404 status code when there is no specified phrase in the database', async () => {
      const response = await phraseRequest.get(`/phrases/${LanguageKeyType.enUK}`);
      expect(response.status).toEqual(404);
    });
  });
});
