// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- How should the first admin be created?
  - [x] Trusted operations script that promotes one existing normalized email.
  - [ ] Public UI or server action for role changes.
*/
import { eq } from 'drizzle-orm';
import { type } from 'arktype';
import { db } from '@/lib/server/db';
import { users } from '@/lib/server/schema';

const parseEmail = type('string.trim |> string.lower |> string.email');
const emailInput = process.argv[2];

if (process.env.CONFIRM_PROMOTE_ADMIN !== '1') {
  console.error('Refusing to promote admin without CONFIRM_PROMOTE_ADMIN=1.');
  process.exit(1);
}

if (!emailInput) {
  console.error('Usage: CONFIRM_PROMOTE_ADMIN=1 bun run ./scripts/promote-user-to-admin.ts <email>');
  process.exit(1);
}

const email = parseEmail.assert(emailInput);
const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
const user = existing[0];

if (!user) {
  console.error(`No existing user found for ${email}. Create the user first, then promote it.`);
  process.exit(1);
}

const promoted = await db
  .update(users)
  .set({ role: 'admin' })
  .where(eq(users.email, email))
  .returning({ id: users.id, email: users.email, role: users.role });

const promotedUser = promoted[0];
if (!promotedUser) {
  console.error(`Failed to promote ${email}.`);
  process.exit(1);
}

console.log(`Promoted user ${promotedUser.id} <${promotedUser.email}> to ${promotedUser.role}.`);
// end of LLM written Code
