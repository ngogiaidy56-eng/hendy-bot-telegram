export async function getUser(env, id) {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id);
  const user = await stmt.first();
  if (user && user.linked_accounts) {
    user.linked_accounts = JSON.parse(user.linked_accounts);
  }
  return user;
}

export async function upsertUser(env, id, name) {
  const defaultAccounts = JSON.stringify({ QQ88: [], '78WIN': [], SC88: [], C168: [], CM88: [], F8BET: [] });
  const query = `
    INSERT INTO users (id, name, balance, voucher, linked_accounts) 
    VALUES (?, ?, 1501, 0, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name;
  `;
  await env.DB.prepare(query).bind(id, name, defaultAccounts).run();
  return await getUser(env, id);
}

export async function updateLinkedAccounts(env, id, linkedAccounts) {
  await env.DB.prepare('UPDATE users SET linked_accounts = ? WHERE id = ?')
    .bind(JSON.stringify(linkedAccounts), id).run();
}
