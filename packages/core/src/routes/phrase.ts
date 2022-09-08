import { Phrases } from '@logto/schemas';

import koaGuard from '@/middleware/koa-guard';
import { findPhraseByLanguageKey } from '@/queries/phrase';

import { AuthedRouter } from './types';

export default function phraseRoutes<T extends AuthedRouter>(router: T) {
  router.get(
    '/phrases/:languageKey',
    koaGuard({
      params: Phrases.createGuard.pick({ languageKey: true }),
      response: Phrases.guard,
    }),
    async (ctx, next) => {
      const {
        params: { languageKey },
      } = ctx.guard;

      ctx.body = await findPhraseByLanguageKey(languageKey);

      return next();
    }
  );
}
