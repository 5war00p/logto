import { CreateLanguage, Language, Languages } from '@logto/schemas';
import { sql } from 'slonik';

import { buildInsertInto } from '@/database/insert-into';
import { convertToIdentifiers } from '@/database/utils';
import envSet from '@/env-set';

const { table, fields } = convertToIdentifiers(Languages);

export const findLanguageByKey = async (languageKey: string): Promise<Language> =>
  envSet.pool.one<Language>(sql`
    select ${sql.join(Object.values(fields), sql`, `)}
    from ${table}
    where ${fields.key} = ${languageKey}
  `);

export const upsertLanguage = buildInsertInto<CreateLanguage, Language>(Languages, {
  returning: true,
  onConflict: {
    fields: [fields.key],
    setExcludedFields: [fields.translation],
  },
});
