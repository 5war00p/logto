import { LanguageKeyType, Phrase, Phrases } from '@logto/schemas';
import { sql } from 'slonik';

import { convertToIdentifiers } from '@/database/utils';
import envSet from '@/env-set';

const { table, fields } = convertToIdentifiers(Phrases);

export const findPhraseByLanguageKey = async (languageKey: LanguageKeyType): Promise<Phrase> =>
  envSet.pool.one<Phrase>(sql`
    select ${sql.join(Object.values(fields), sql`, `)}
    from ${table}
    where ${fields.languageKey} = ${languageKey}
  `);
