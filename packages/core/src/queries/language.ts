import { Language, Languages } from '@logto/schemas';
import { sql } from 'slonik';

import { convertToIdentifiers } from '@/database/utils';
import envSet from '@/env-set';

const { table, fields } = convertToIdentifiers(Languages);

export const findLanguageByKey = async (languageKey: string): Promise<Language> =>
  envSet.pool.one<Language>(sql`
    select ${sql.join(Object.values(fields), sql`, `)}
    from ${table}
    where ${fields.key} = ${languageKey}
  `);
