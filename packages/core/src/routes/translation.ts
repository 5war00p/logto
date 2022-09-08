import { Languages, translationGuard } from '@logto/schemas';
import { NotFoundError } from 'slonik';

import koaGuard from '@/middleware/koa-guard';
import { findLanguageByKey } from '@/queries/language';

import { AuthedRouter } from './types';

const getLanguage = async (languageKey: string) => {
  try {
    return await findLanguageByKey(languageKey);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return { key: languageKey, translation: {} };
    }
    throw error;
  }
};

export default function translationRoutes<T extends AuthedRouter>(router: T) {
  router.get(
    '/translations/:key',
    koaGuard({
      params: Languages.createGuard.pick({ key: true }),
      response: translationGuard,
    }),
    async (ctx, next) => {
      const {
        params: { key },
      } = ctx.guard;

      const { translation } = await getLanguage(key);
      ctx.body = translation;

      return next();
    }
  );
}
