import { Brand } from "effect";

export type Cent = Brand.Branded<bigint, 'Cent'>;
export const Cent = {
  new: Brand.nominal<Cent>(),
  toDollar: (v: Cent): Dollar => Dollar.new(v / 100n),
  fromDollar: (v: Dollar): Cent => Cent.new(v * 100n),
}

export type Dollar = Brand.Branded<bigint, 'Dollar'>;
export const Dollar = {
  new: Brand.nominal<Dollar>(),
  toCent: (v: Dollar): Cent => Cent.new(v * 100n),
  fromCent: (v: Cent): Dollar => Dollar.new(v / 100n),
}

export type Units = Brand.Branded<bigint, 'Units'>;
export const Units = Brand.nominal<Units>();