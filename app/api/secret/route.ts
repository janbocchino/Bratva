import { UserId } from '@/domain/values/user';
import { Db, db } from '@/lib/server/db';
import { userReadRepo } from '@/lib/server/ports/user';
import { E } from '@/lib/shared/imports';

export async function GET(request: Request) {
	const id = UserId(1);

	const userEffect = await userReadRepo
		.getUser({ id })
		.pipe(E.provideService(Db, db))
		.pipe(E.runPromise);
}
