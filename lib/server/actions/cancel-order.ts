// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { Order } from '@/domain/aggregates/exchange';
import type { Order as OrderType } from '@/domain/aggregates/exchange';
import { Db, db } from '../db';
import { orderReadRepo, orderWriteRepo } from '../ports/exchange';
import { userReadRepo } from '../ports/user';

export async function cancelOrder(p: {
  userId: number;
  orderId: number;
}): Promise<OrderType> {
  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

  const order = orderReadRepo.getOrderById(p.orderId);

  const pipeline = Fn.pipe(
    E.all({ user, order }),
    E.flatMap(({ user, order }) => {
      if (order.userId !== user.id) return E.fail(new Error('Order does not belong to user'));
      if (order.status !== 'open') return E.fail(new Error('Only open orders can be cancelled'));
      return E.succeed(order);
    }),
    E.flatMap(Order.cancel),
    E.tap((cancelled) =>
      orderWriteRepo.updateOrderFills([
        { orderId: cancelled.id, filled: 0, status: 'cancelled' },
      ]),
    ),
  );

  return await pipeline.pipe(E.provideService(Db, db), E.runPromise);
}
// end of LLM written Code
