import type BigNumber from "bignumber.js";

export interface ShadeRoutePoolEssential {
  token1Id: any;
  token0Id: any;
  token0Amount: Amount;
  stableParams: any;
  id: any;
  fees: any;
  flags: string[];
  token1Amount: Amount;
}
export type Amount = BigNumber;
export type PoolId = string;

export interface TokenPairInfoRaw {
  id: string;
  // factory: string;
  /**
   * token_0 : "06180689-1c8e-493d-a19f-71dbc5dddbfc"
   * token_0_amount : "132661431360"
   * token_1 : "7524b771-3540-4829-aff1-c6d42b424e61"
   * token_1_amount : "499623041187"
   */
  token_0: string;
  token_0_amount: string;
  token_1: string;
  token_1_amount: string;
  lp_token: string;
  /**
   * {
   *     "a": "150",
   *     "gamma1": "2",
   *     "gamma2": "50",
   *     "min_trade_size_0_to_1": "0.0001",
   *     "min_trade_size_1_to_0": "0.0001",
   *     "max_price_impact_allowed": "1000",
   *     "price_ratio": "0.948439957804714905975629335"
   *   }
   */
  stable_params: {
    'a': string;
    'gamma1': string;
    'gamma2': string;
    'min_trade_size_0_to_1': string;
    'min_trade_size_1_to_0': string;
    'max_price_impact_allowed': string;
    'price_ratio': string;
  };
  fees: {
    'dao': string;
    'lp': string;
  };
  flags: string[]; // derivative/stable
}

export type ShadeRoutePoolEssentialsIdMap = Record<string, ShadeRoutePoolEssential>;
