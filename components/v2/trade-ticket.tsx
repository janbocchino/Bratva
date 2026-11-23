// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type TradeSide = 'bid' | 'ask';

type TradeTicketProps = {
  actionTab: 'liquidity' | 'trade';
  onActionTabChange: (tab: 'liquidity' | 'trade') => void;
  liquidityAmountDollars: string;
  onLiquidityAmountChange: (value: string) => void;
  onProvideLiquidity: (event: React.FormEvent<HTMLFormElement>) => void;
  isLiquiditySubmitting: boolean;
  tradeSide: TradeSide;
  onTradeSideChange: (side: TradeSide) => void;
  tradePrice: string;
  onTradePriceChange: (value: string) => void;
  tradePricePlaceholder: string;
  tradeQuantity: string;
  onTradeQuantityChange: (value: string) => void;
  tradeStopLoss: string;
  onTradeStopLossChange: (value: string) => void;
  tradeExpiresAt: string;
  onTradeExpiresAtChange: (value: string) => void;
  onPlaceTrade: (event: React.FormEvent<HTMLFormElement>) => void;
  isTradeSubmitting: boolean;
  isTradeDisabled: boolean;
  tradeDisabledReason: string | null;
  hasAccount: boolean;
};

export function TradeTicket({
  actionTab,
  onActionTabChange,
  liquidityAmountDollars,
  onLiquidityAmountChange,
  onProvideLiquidity,
  isLiquiditySubmitting,
  tradeSide,
  onTradeSideChange,
  tradePrice,
  onTradePriceChange,
  tradePricePlaceholder,
  tradeQuantity,
  onTradeQuantityChange,
  tradeStopLoss,
  onTradeStopLossChange,
  tradeExpiresAt,
  onTradeExpiresAtChange,
  onPlaceTrade,
  isTradeSubmitting,
  isTradeDisabled,
  tradeDisabledReason,
  hasAccount,
}: TradeTicketProps) {
  return (
    <div className='rounded-2xl border border-border bg-card p-4 md:sticky md:top-6'>
      <Tabs value={actionTab} onValueChange={(v) => onActionTabChange(v as 'liquidity' | 'trade')}>
        <TabsList className='w-full'>
          <TabsTrigger value='liquidity' className='flex-1'>
            Liquidity
          </TabsTrigger>
          <TabsTrigger value='trade' className='flex-1' disabled={isTradeDisabled}>
            Trade
          </TabsTrigger>
        </TabsList>

        <TabsContent value='liquidity' className='mt-4'>
          <form onSubmit={onProvideLiquidity}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='provide-amount'>Amount (USD)</FieldLabel>
                <Input
                  id='provide-amount'
                  type='text'
                  value={liquidityAmountDollars}
                  onChange={(e) => onLiquidityAmountChange(e.target.value)}
                  disabled={!hasAccount || isLiquiditySubmitting}
                  className='font-mono tabular-nums'
                />
              </Field>
              <Button
                type='submit'
                className='w-full'
                disabled={!hasAccount || isLiquiditySubmitting}
              >
                {isLiquiditySubmitting ? 'Providing…' : 'Submit liquidity'}
              </Button>
            </FieldGroup>
          </form>
        </TabsContent>

        <TabsContent value='trade' className='mt-4'>
          {tradeDisabledReason !== null ? (
            <Alert className='mb-4'>
              <AlertDescription>{tradeDisabledReason}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={onPlaceTrade}>
            <FieldGroup>
              <Field>
                <FieldLabel>Side</FieldLabel>
                <div className='grid grid-cols-2 gap-2'>
                  <Button
                    type='button'
                    className={cn(tradeSide === 'bid' && 'bg-primary text-primary-foreground')}
                    variant={tradeSide === 'bid' ? 'default' : 'outline'}
                    onClick={() => onTradeSideChange('bid')}
                  >
                    Buy
                  </Button>
                  <Button
                    type='button'
                    className={cn(
                      tradeSide === 'ask' &&
                        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    )}
                    variant={tradeSide === 'ask' ? 'default' : 'outline'}
                    onClick={() => onTradeSideChange('ask')}
                  >
                    Sell
                  </Button>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor='trade-price'>Price</FieldLabel>
                <Input
                  id='trade-price'
                  type='text'
                  value={tradePrice}
                  placeholder={tradePricePlaceholder}
                  onChange={(e) => onTradePriceChange(e.target.value)}
                  disabled={!hasAccount || isTradeDisabled || isTradeSubmitting}
                  className='font-mono tabular-nums'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='trade-quantity'>Quantity</FieldLabel>
                <Input
                  id='trade-quantity'
                  type='text'
                  value={tradeQuantity}
                  onChange={(e) => onTradeQuantityChange(e.target.value)}
                  disabled={!hasAccount || isTradeDisabled || isTradeSubmitting}
                  className='font-mono tabular-nums'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='trade-stop-loss'>Stop loss (optional)</FieldLabel>
                <Input
                  id='trade-stop-loss'
                  type='text'
                  value={tradeStopLoss}
                  placeholder='0'
                  onChange={(e) => onTradeStopLossChange(e.target.value)}
                  disabled={!hasAccount || isTradeDisabled || isTradeSubmitting}
                  className='font-mono tabular-nums'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='trade-expires-at'>Expires at (optional)</FieldLabel>
                <Input
                  id='trade-expires-at'
                  type='datetime-local'
                  value={tradeExpiresAt}
                  onChange={(e) => onTradeExpiresAtChange(e.target.value)}
                  disabled={!hasAccount || isTradeDisabled || isTradeSubmitting}
                />
              </Field>
              <Button
                type='submit'
                className='w-full'
                disabled={!hasAccount || isTradeDisabled || isTradeSubmitting}
              >
                {isTradeSubmitting
                  ? 'Submitting…'
                  : `Submit ${tradeSide === 'bid' ? 'buy' : 'sell'}`}
              </Button>
            </FieldGroup>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// end of LLM written Code
