import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { Asset } from '../aggregates/asset';
import type { PortError } from '../errors';

export const GetAssetParams = type({
  id: 'number',
})
  .or({
    publicId: 'string',
  })
  .or({
    ticker: 'string',
  });

export type GetAssetParams = typeof GetAssetParams.infer;

export interface AssetReadRepo<D> {
  getAsset(o: GetAssetParams): E.Effect<Asset, PortError, D>;
}

export const CreateAssetParams = type({
  name: 'string.trim',
  ticker: 'string.trim |> string.lower',
  // beginning of LLM written Code, Model: GPT-5.5
  kind: "'token' | 'fiat'?",
  // end of LLM written Code
});

export type CreateAssetParams = typeof CreateAssetParams.infer;

export interface AssetWriteRepo<D> {
  createAsset(o: CreateAssetParams): E.Effect<Asset, PortError, D>;
}
