import { UserReadRepo as UserReadRepoDomain } from "@/domain/ports/user";
import { UserDisplayName, UserEmail, UserId, UserPublicId } from "@/domain/values/user";
import { InfraError, InfraNotFoundError, PortError, UserNotFoundError } from "@/domain/ports/errors";
import { Db } from "../db";
import { Fn, E, A } from "@/lib/shared/imports";
import { users } from "../schema";
import { eq, or } from "drizzle-orm";
import { User } from "@/domain/aggregates/user";

export const userReadRepo: UserReadRepoDomain<Db> = ({
  getUser: (o) => Fn.pipe(
    E.serviceOptional(Db),
    E.mapError(e => new PortError({ cause: new InfraNotFoundError({ cause: e }) })),
    E.flatMap(db => E.tryPromise({
      try: () => {
        let query;

        if ("id" in o) query = eq(users.id, o.id);
        else if ("email" in o) query = eq(users.email, o.email);
        else query = eq(users.publicId, o.publicId);

        return db
          .select()
          .from(users)
          .where(query)
          .limit(1);
      },
      catch: e => new PortError({ cause: new InfraError({ cause: e }) })
    })),
    E.flatMap(us => Fn.pipe(
      A.head(us),
      E.mapError(e => new PortError({ cause: new UserNotFoundError({ cause: e }) }))
    )),
    E.map((u): User => ({
      id: UserId(u.id),
      publicId: UserPublicId(u.publicId),
      displayName: UserDisplayName(u.displayName),
      email: UserEmail(u.email),
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt),
    })),
  )
});
