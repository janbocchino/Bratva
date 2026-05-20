// beginning of LLM written Code, Model: Gemini
'use server';

import type { Order as OrderType } from '@/domain/aggregates/exchange';
import { Order } from '@/domain/aggregates/exchange';
import { OrderNotCancellableError, OrderOwnershipError } from '@/domain/errors';
import { TokenAmount } from '@/domain/values/currencies';
import { E, Fn } from '@/lib/shared/imports';
import { requireUser } from '../auth/guards';
import { Db, db } from '../db';
import { orderReadRepo, orderWriteRepo } from '../ports/exchange';
import { runServerDomainEffect } from '../run-server-domain-effect';

export async function cancelOrder(p: { orderId: number }): Promise<OrderType> {
  // beginning of LLM written Code, Model: GPT-5.5
  const user = requireUser();
  // end of LLM written Code

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
