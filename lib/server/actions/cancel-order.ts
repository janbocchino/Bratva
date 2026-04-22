// beginning of LLM written Code, Model: Gemini
'use server';

import type { Order as OrderType } from '@/domain/aggregates/exchange';
import { Order } from '@/domain/aggregates/exchange';
import { OrderNotCancellableError, OrderOwnershipError } from '@/domain/errors';
import { TokenAmount } from '@/domain/values/currencies';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { orderReadRepo, orderWriteRepo } from '../ports/exchange';
import { userReadRepo } from '../ports/user';
import { runServerDomainEffect } from '../run-server-domain-effect';

export async function cancelOrder(p: { userId: number; orderId: number }): Promise<OrderType> {
  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

  const order = orderReadRepo.getOrderById(p.orderId);

  const pipeline = Fn.pipe(
    E.all({ user, order }),
    E.flatMap(
      ({ user, order }): E.Effect<OrderType, OrderOwnershipError | OrderNotCancellableError> => {
        if (order.userId !== user.id)
          return E.fail(new OrderOwnershipError({ orderId: order.id, userId: user.id }));
        if (order.status !== 'open')
          return E.fail(new OrderNotCancellableError({ orderId: order.id, status: order.status }));
        return E.succeed(Order.cancel(order, new Date()));
      },
    ),
    E.tap((cancelled) =>
      orderWriteRepo.updateOrderFills([
        { orderId: cancelled.id, filled: TokenAmount.new(0n), status: 'cancelled' },
      ]),
    ),
  );

  return await runServerDomainEffect(pipeline.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
