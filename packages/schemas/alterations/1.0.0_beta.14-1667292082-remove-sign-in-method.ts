import { sql } from 'slonik';

import type { AlterationScript } from '../lib/types/alteration';

const alteration: AlterationScript = {
  up: async (pool) => {
    await pool.query(sql`
      alter table sign_in_experiences drop column sign_in_methods
    `);
  },
  down: async (pool) => {
    await pool.query(sql`
      alter table sign_in_experiences add column sign_in_methods jsonb not null default '{}'::jsonb,
    `);
  },
};

export default alteration;
