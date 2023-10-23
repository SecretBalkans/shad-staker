/* eslint-disable */
/* tslint:disable:one-variable-per-declaration */
// noinspection CommaExpressionJS
//asd@ts-nocheck
// @ts-nocheck
import BigNumber from 'bignumber.js';
import ShadeCalc from './shade-calc';
import type {Amount, ShadeRoutePoolEssential, TokenPairInfoRaw} from "@/utils/types";

class StableSwapSimulator {
  pool0Size: any;
  priceOfToken1: any;
  pool1Size: any;
  gamma1: any;
  gamma2: any;
  lpFee: any;
  shadeDaoFee: any;
  minTradeSize0For1: any;
  invariant: any;
  minTradeSize1For0: any;
  priceImpactLimit: any;
  a: any;

  constructor(e, t, n, o, s, a, r, l, d, u, p) {
    BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      this.pool0Size = e,
      this.pool1Size = t,
      this.priceOfToken1 = n,
      this.a = o,
      this.gamma1 = s,
      this.gamma2 = a,
      this.lpFee = r,
      this.shadeDaoFee = l,
      this.invariant = this.calculateInvariant(),
      this.minTradeSize0For1 = d,
      this.minTradeSize1For0 = u,
      this.priceImpactLimit = p;
  }

  solveInvFnForPool1Size(e) {
    const t = e.dividedBy(this.invariant)
      , n = a => this.invariantFnFromPoolSizes(t, a)
      , o = a => this.derivRespectToPool1OfInvFn(t, a);
    return this.findZeroWithPool1Params(n, o).multipliedBy(this.invariant).dividedBy(this.priceOfToken1);
  }

  solveInvFnForPool0Size(e) {
    const t = e.dividedBy(this.invariant)
      , n = a => this.invariantFnFromPoolSizes(a, t)
      , o = a => this.derivRespectToPool0OfInvFnFromPool0(a, t);
    return this.findZeroWithPool0Params(n, o).multipliedBy(this.invariant);
  }

  swapToken0WithToken1(e) {
    const t = this.simulateToken0WithToken1Trade(e);
    return this.executeTrade(t);
  }

  swapToken1WithToken0(e) {
    const t = this.simulateToken1WithToken0Trade(e);
    return this.executeTrade(t);
  }

  executeTrade(e) {
    return this.pool0Size = e.newPool0,
      this.pool1Size = e.newPool1,
      this.calculateInvariant(),
      e.tradeReturn;
  }

  simulateReverseToken0WithToken1Trade(e) {
    const t = this.lpFee.multipliedBy(e)
      , n = this.shadeDaoFee.multipliedBy(e)
      , o = t.plus(n)
      , s = e.minus(o)
      , a = this.pool1Size.minus(e)
      , r = a.multipliedBy(this.priceOfToken1)
      , l = this.solveInvFnForPool0Size(r);
    this.verifySwapPriceImpactInBounds(l, a, !0);
    const d = l.minus(this.pool0Size);
    validateTradeSize(d, this.minTradeSize0For1);
    const u = a.plus(t);
    return {
      newPool0: l,
      newPool1: u,
      tradeInput: d,
      tradeReturn: s,
      lpFeeAmount: t,
      shadeDaoFeeAmount: n,
    };
  }

  simulateReverseToken1WithToken0Trade(e) {
    const t = this.lpFee.multipliedBy(e)
      , n = this.shadeDaoFee.multipliedBy(e)
      , o = t.plus(n)
      , s = e.minus(o)
      , a = this.pool0Size.minus(e)
      , r = this.solveInvFnForPool1Size(a);
    this.verifySwapPriceImpactInBounds(a, r, !1);
    const l = r.minus(this.pool1Size);
    return validateTradeSize(l, this.minTradeSize1For0),
      {
        newPool0: a.plus(t),
        newPool1: r,
        tradeInput: l,
        tradeReturn: s,
        lpFeeAmount: t,
        shadeDaoFeeAmount: n,
      };
  }

  simulateToken0WithToken1Trade(e) {
    validateTradeSize(e, this.minTradeSize0For1);
    const t = this.pool0Size.plus(e)
      , n = this.solveInvFnForPool1Size(t);
    this.verifySwapPriceImpactInBounds(t, n, !0);
    const o = this.pool1Size.minus(n)
      , s = this.lpFee.multipliedBy(o)
      , a = this.shadeDaoFee.multipliedBy(o)
      , r = n.plus(s);
    return {
      newPool0: t,
      newPool1: r,
      tradeReturn: o.minus(s).minus(a),
      lpFeeAmount: s,
      shadeDaoFeeAmount: a,
    };
  }

  simulateToken1WithToken0Trade(e) {
    validateTradeSize(e, this.minTradeSize1For0);
    const t = this.pool1Size.plus(e)
      , n = this.priceOfToken1.multipliedBy(t)
      , o = this.solveInvFnForPool0Size(n);
    this.verifySwapPriceImpactInBounds(o, t, !1);
    const s = this.pool0Size.minus(o)
      , a = this.lpFee.multipliedBy(s)
      , r = this.shadeDaoFee.multipliedBy(s);
    return {
      newPool0: o.plus(a),
      newPool1: t,
      tradeReturn: s.minus(a).minus(r),
      lpFeeAmount: a,
      shadeDaoFeeAmount: r,
    };
  }

  verifySwapPriceImpactInBounds(e, t, n) {
    const o = this.priceImpactAt(e, t, n);
    if (o.isGreaterThan(this.priceImpactLimit) || o.isLessThan(BigNumber(0)))
      throw Error(`The slippage of this trade is outside of the acceptable range of 0% - ${this.priceImpactLimit}%.`);
  }

  priceImpactAt(e, t, n) {
    const o = n ? this.priceToken1() : this.priceToken0();
    return (n ? this.priceToken1At(e, t) : this.priceToken0At(e, t)).dividedBy(o).minus(BigNumber(1)).multipliedBy(100);
  }

  priceImpactToken0ForToken1(e) {
    const t = this.pool0Size.plus(e)
      , n = this.solveInvFnForPool1Size(t);
    return this.priceImpactAt(t, n, !0);
  }

  priceImpactToken1ForToken0(e) {
    const t = this.pool1Size.plus(e)
      , n = this.solveInvFnForPool0Size(this.priceOfToken1.multipliedBy(t));
    return this.priceImpactAt(n, t, !1);
  }

  negativeTangent(e, t) {
    return this.derivRespectToPool0OfInvFnFromPool0(e, t).dividedBy(this.derivRespectToPool1OfInvFn(e, t)).dividedBy(this.priceOfToken1);
  }

  priceToken1At(e, t) {
    return BigNumber(1).dividedBy(this.negativeTangent(e.dividedBy(this.invariant), this.priceOfToken1.multipliedBy(t).dividedBy(this.invariant)));
  }

  priceToken1() {
    return this.priceToken1At(this.pool0Size, this.pool1Size);
  }

  priceToken0At(e, t) {
    return this.negativeTangent(e.dividedBy(this.invariant), this.priceOfToken1.multipliedBy(t).dividedBy(this.invariant));
  }

  priceToken0() {
    return this.priceToken0At(this.pool0Size, this.pool1Size);
  }

  updatePriceOfToken1(e) {
    this.priceOfToken1 = e,
      this.calculateInvariant();
  }

  token1TvlInUnitsToken0() {
    return this.priceOfToken1.multipliedBy(this.pool1Size);
  }

  totalTvl() {
    return this.pool0Size.plus(this.token1TvlInUnitsToken0());
  }

  geometricMeanDoubled() {
    const e = this.token1TvlInUnitsToken0();
    return this.pool0Size.isLessThanOrEqualTo(BigNumber(1)) || e.isLessThanOrEqualTo(BigNumber(1)) ? BigNumber(0) : this.pool0Size.sqrt().multipliedBy(e.sqrt()).multipliedBy(BigNumber(2));
  }

  calculateInvariant() {
    const e = this.token1TvlInUnitsToken0()
      , gamma = this.pool0Size.isLessThanOrEqualTo(e) ? this.gamma1 : this.gamma2
      , n = a => this.invariantFnFromInv(a, gamma)
      , o = a => this.derivRespectToInvOfInvFn(a, gamma)
      , s = this.findZeroWithInvariantParams(n, o);
    return this.invariant = s,
      s;
  }

  invariantFnFromInv(e, t) {
    const n = this.token1TvlInUnitsToken0()
      , s = this.getCoeffScaledByInv(e, t, n).multipliedBy(e.multipliedBy(this.pool0Size.plus(n.minus(e))))
      , a = this.pool0Size.multipliedBy(n)
      , r = e.multipliedBy(e).dividedBy(4);
    return s.plus(a).minus(r);
  }

  derivRespectToInvOfInvFn(e, t) {
    const n = this.token1TvlInUnitsToken0()
      , o = this.getCoeffScaledByInv(e, t, n)
      , s = BigNumber(-2).multipliedBy(t).plus(1).multipliedBy(this.pool0Size.minus(e).plus(n)).minus(e);
    return o.multipliedBy(s).minus(e.dividedBy(2));
  }

  getCoeffScaledByInv(e, t, n) {
    return this.a.multipliedBy(BigNumber(4).multipliedBy(this.pool0Size.dividedBy(e)).multipliedBy(n.dividedBy(e)).pow(t));
  }

  getCoeff(e, t, n) {
    const o = e.multipliedBy(t);
    return this.a.multipliedBy(BigNumber(4).multipliedBy(o).pow(n));
  }

  invariantFnFromPoolSizes(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = e.multipliedBy(t);
    return this.getCoeff(e, t, n).multipliedBy(e.plus(t).minus(1)).plus(o).minus(.25);
  }

  derivRespectToPool0OfInvFnFromPool0(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = this.getCoeff(e, t, n)
      , s = n.multipliedBy(e.plus(t).minus(1)).dividedBy(e).plus(1);
    return o.multipliedBy(s).plus(t);
  }

  derivRespectToPool1OfInvFn(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = this.getCoeff(e, t, n)
      , s = n.multipliedBy(e.plus(t).minus(1).dividedBy(t)).plus(1);
    return o.multipliedBy(s).plus(e);
  }

  findZeroWithInvariantParams(f, df) {
    const n = this.totalTvl();
    return findZeroNewtonOrBisect(f, df, n, n, !0, this.geometricMeanDoubled.bind(this), void 0);
  }

  findZeroWithPool0Params(e, t) {
    const n = this.pool0Size.dividedBy(this.invariant);
    return findZeroNewtonOrBisect(e, t, n, n, !1, void 0, BigNumber(0));
  }

  findZeroWithPool1Params(e, t) {
    const n = this.token1TvlInUnitsToken0().dividedBy(this.invariant);
    return findZeroNewtonOrBisect(e, t, n, n, !1, void 0, BigNumber(0));
  }
}

export function findShadePaths({
                                 startingTokenId: startingTokenId,
                                 endingTokenId: endingTokenId,
                                 maxHops: maxHops,
                                 pools: pools,
                               }: {
  startingTokenId: string, endingTokenId: string, maxHops: number,
  pools: Record<string, ShadeRoutePoolEssential>
}): any[] {
  const tmpArr = []
    , result = []
    , someSet = new Set();

  function theFunction(f, someIndex) {
    if (!(someIndex > maxHops)) {
      if (f === endingTokenId) {
        result.push([...tmpArr]);
        return;
      }
      Object.entries(pools).forEach(([F, P]: any) => {
        // tslint:disable-next-line:no-unused-expression
          someSet.has(F) || (P.token0Id === f || P.token1Id === f) && (tmpArr.push(F),
            someSet.add(F),
            P.token0Id === f ? theFunction(P.token1Id, someIndex + 1) : theFunction(P.token0Id, someIndex + 1),
            someSet.delete(F),
            tmpArr.pop());
        },
      );
    }
  }

  return theFunction(startingTokenId, 0),
    result;
}

export interface ShadeSwapRoute {
  inputAmount: BigNumber;
  quoteOutputAmount: BigNumber;
  quoteShadeDaoFee: BigNumber;
  quoteLPFee: BigNumber;
  priceImpact: BigNumber;
  sourceTokenId: string;
  targetTokenId: string;
  route: ShadeRoutePoolEssential[];
}

export function stableSwapToken0ToToken1InPool(stablePoolParams: { inputToken0Amount: BigNumber; poolToken0Amount: BigNumber; poolToken1Amount: BigNumber; priceRatio: BigNumber; a: any; gamma1: any; gamma2: any; liquidityProviderFee: any; daoFee: any; minTradeSizeToken0For1: any; minTradeSizeToken1For0: any; priceImpactLimit: any; }) {
  const {
    inputToken0Amount: i,
    poolToken0Amount: e,
    poolToken1Amount: t,
    priceRatio: n,
    a: o,
    gamma1: s,
    gamma2: a,
    liquidityProviderFee: r,
    daoFee: l,
    minTradeSizeToken0For1: d,
    minTradeSizeToken1For0: u,
    priceImpactLimit: p,
  } = stablePoolParams;

  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }), new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  return m().swapToken0WithToken1(i);
}

/** PriceImpact */
export function calculateStableSwapPriceImpactInputToken0({
                                                            inputToken0Amount: i,
                                                            poolToken0Amount: e,
                                                            poolToken1Amount: t,
                                                            priceRatio: n,
                                                            a: o,
                                                            gamma1: s,
                                                            gamma2: a,
                                                            liquidityProviderFee: r,
                                                            daoFee: l,
                                                            minTradeSizeToken0For1: d,
                                                            minTradeSizeToken1For0: u,
                                                            priceImpactLimit: p,
                                                          }): any {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = m()
    , f = h.priceToken1()
    , g = h.swapToken0WithToken1(i).dividedBy(BigNumber(1).minus(r.plus(l)));
  return i.dividedBy(g).dividedBy(f).minus(1);
}

export function stableSwapToken1ToToken0InPool({
                                                 inputToken1Amount: i,
                                                 poolToken0Amount: e,
                                                 poolToken1Amount: t,
                                                 priceRatio: n,
                                                 a: o,
                                                 gamma1: s,
                                                 gamma2: a,
                                                 liquidityProviderFee: r,
                                                 daoFee: l,
                                                 minTradeSizeToken0For1: d,
                                                 minTradeSizeToken1For0: u,
                                                 priceImpactLimit: p,
                                               }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  return m().swapToken1WithToken0(i);
}

export function calculateStableSwapPriceImpactInputToken1({
                                                            inputToken1Amount: i,
                                                            poolToken0Amount: e,
                                                            poolToken1Amount: t,
                                                            priceRatio: n,
                                                            a: o,
                                                            gamma1: s,
                                                            gamma2: a,
                                                            liquidityProviderFee: r,
                                                            daoFee: l,
                                                            minTradeSizeToken0For1: d,
                                                            minTradeSizeToken1For0: u,
                                                            priceImpactLimit: p,
                                                          }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = m()
    , f = h.priceToken0()
    , g = h.swapToken1WithToken0(i).dividedBy(BigNumber(1).minus(r.plus(l)));
  return i.dividedBy(g).dividedBy(f).minus(1);
}

export function Fo({ token0LiquidityAmount: i, token1LiquidityAmount: e, token0InputAmount: t, fee: n }) {
  const o = e.minus(i.multipliedBy(e).dividedBy(i.plus(t)))
    , s = o.minus(o.multipliedBy(n));
  return BigNumber(s.toFixed(0));
}

export function calculateXYKPriceImpactFromToken0Amount({
                                                          token0LiquidityAmount: i,
                                                          token1LiquidityAmount: e,
                                                          token0InputAmount: t,
                                                        }) {
  const n = i.dividedBy(e)
    , o = i.multipliedBy(e)
    , s = i.plus(t)
    , a = o.dividedBy(s)
    , r = e.minus(a);
  return t.dividedBy(r).dividedBy(n).minus(1);
}

export function Ro({ token0LiquidityAmount: i, token1LiquidityAmount: e, token1InputAmount: t, fee: n }) {
  const o = i.minus(i.multipliedBy(e).dividedBy(e.plus(t)))
    , s = o.minus(o.multipliedBy(n));
  return BigNumber(s.toFixed(0));
}

export function calculateXYKPriceImpactFromToken1Amount({
                                                          token0LiquidityAmount: i,
                                                          token1LiquidityAmount: e,
                                                          token1InputAmount: t,
                                                        }) {
  const n = e.dividedBy(i)
    , o = e.multipliedBy(i)
    , s = e.plus(t)
    , a = o.dividedBy(s)
    , r = i.minus(a);
  return t.dividedBy(r).dividedBy(n).minus(1);
}

export function getTradeInputOfSimulateReverseToken0WithToken1Trade({
                                                                      outputToken1Amount: i,
                                                                      poolToken0Amount: e,
                                                                      poolToken1Amount: t,
                                                                      priceRatio: n,
                                                                      a: o,
                                                                      gamma1: s,
                                                                      gamma2: a,
                                                                      liquidityProviderFee: r,
                                                                      daoFee: l,
                                                                      minTradeSizeToken0For1: d,
                                                                      minTradeSizeToken1For0: u,
                                                                      priceImpactLimit: p,
                                                                    }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = r.plus(l)
    , f = i.dividedBy(BigNumber(1).minus(h));
  return m().simulateReverseToken0WithToken1Trade(f).tradeInput;
}

export function getTradeInputOfSimulateReverseToken1WithToken0Trade({
                                                                      outputToken0Amount: i,
                                                                      poolToken0Amount: e,
                                                                      poolToken1Amount: t,
                                                                      priceRatio: n,
                                                                      a: o,
                                                                      gamma1: s,
                                                                      gamma2: a,
                                                                      liquidityProviderFee: r,
                                                                      daoFee: l,
                                                                      minTradeSizeToken0For1: d,
                                                                      minTradeSizeToken1For0: u,
                                                                      priceImpactLimit: p,
                                                                    }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = r.plus(l)
    , f = i.dividedBy(BigNumber(1).minus(h));
  return m().simulateReverseToken1WithToken0Trade(f).tradeInput;
}

export function calculateXYKToken0AmountFromToken1Amount({
                                                           token0LiquidityAmount: i,
                                                           token1LiquidityAmount: e,
                                                           token1OutputAmount: t,
                                                           fee: n,
                                                         }) {
  if (t.isGreaterThanOrEqualTo(e))
    throw Error('Not enough liquidity for swap');
  const o = i.multipliedBy(e).dividedBy(t.dividedBy(BigNumber(1).minus(n)).minus(e)).plus(i).multipliedBy(-1);
  return BigNumber(o.toFixed(0));
}

export function calculateXYKToken1AmountFromToken0Amount({
                                                           token0LiquidityAmount: x,
                                                           token1LiquidityAmount: y,
                                                           token0OutputAmount: t0,
                                                           fee: fee,
                                                         }) {
  if (t0.isGreaterThanOrEqualTo(x))
    throw Error('Not enough liquidity for swap');
  const o = y.multipliedBy(x).dividedBy(t0.dividedBy(BigNumber(1).minus(fee)).minus(x)).plus(y).multipliedBy(-1);
  return BigNumber(o.toFixed(0));
}

export function validateTradeSize(i, e) {
  if(i.isNaN()) {
    throw new Error('Trade size NaN');
  }
  if (i.isLessThanOrEqualTo(0))
    throw Error('Trade size must be positive');
  if (i.isLessThanOrEqualTo(e))
    throw Error(`Trade size must be larger than minimum trade size of ${e}`);
}

function findZeroNewtonOrBisect(f, df, initial, n, o, s, a) {
  const epsilon = BigNumber(1e-16)
    , maxIterNewton = 80
    , maxIterBisect = 150;
  try {
    const u = newtonMethod(f, df, initial, epsilon, maxIterNewton);
    if (!o || u.isGreaterThanOrEqualTo(0))
      return u;
  } catch (u) {
    if (!(u instanceof NewtonMethodError))
      throw u;
  }
  if (a !== void 0)
    return Bisect(f, a, n, epsilon, maxIterBisect);
  if (s !== void 0)
    return Bisect(f, s(), n, epsilon, maxIterBisect);
  throw Error('No lower bound was found for bisect');
}

function Bisect(i, e, t, n, o) {
  const s = i(e)
    , a = i(t);
  if (s.isEqualTo(0))
    return e;
  if (a.isEqualTo(0))
    return t;
  if (s.isGreaterThan(0) && a.isGreaterThan(0) || s.isLessThan(0) && a.isLessThan(0))
    throw Error('bisect endpoints must have different signs');
  let r = t.minus(e)
    , l = e;
  for (let d = 0; d < o; d += 1) {
    r = r.multipliedBy(BigNumber(.5));
    const u = l.plus(r)
      , p = i(u);
    // tslint:disable-next-line:no-conditional-assignment
    if (s.multipliedBy(p).isGreaterThanOrEqualTo(0) && (l = u),
    p || r.abs().isLessThanOrEqualTo(n))
      return u;
  }
  throw Error('Bisect exceeded max iterations');
}

function newtonMethod(f, df, initial, epsilon, maxIter) {
  let s = initial;
  for (let a = 0; a < maxIter; a += 1) {
    const r = s
      , l = f(s)
      , d = df(s);
    if (d.isEqualTo(0))
      throw new NewtonMethodError('Newton encountered slope of 0');
    // tslint:disable-next-line:no-conditional-assignment
    if (s = s.minus(l.dividedBy(d)),
      s.minus(r).abs().isLessThanOrEqualTo(epsilon))
      return s;
  }
  throw new NewtonMethodError('Newton exceeded max iterations');
}

// tslint:disable-next-line:max-classes-per-file
class NewtonMethodError extends Error {
  constructor(e) {
    super(e),
      this.name = 'NewtonMethodError';
  }
}

export function parseRawShadePool(n: TokenPairInfoRaw, t0decimals: number, t1decimals: number): ShadeRoutePoolEssential {
  let stable;
  !!n.stable_params ? stable = {
    priceRatio: BigNumber(n.stable_params.price_ratio),
    a: BigNumber(n.stable_params.a),
    gamma1: BigNumber(n.stable_params.gamma1),
    gamma2: BigNumber(n.stable_params.gamma2),
    minTradeSizeToken0For1: BigNumber(n.stable_params.min_trade_size_0_to_1),
    minTradeSizeToken1For0: BigNumber(n.stable_params.min_trade_size_1_to_0),
    maxPriceImpactAllowed: BigNumber(n.stable_params.max_price_impact_allowed),
  } : stable = null;
  const e = {
    fees: {
      dao: BigNumber(n.fees.dao),
      liquidityProvider: BigNumber(n.fees.lp),
    },
    id: n.id,
    token0Id: n.token_0,
    token0AmountRaw: n.token_0_amount,
    token1Id: n.token_1,
    token1AmountRaw: n.token_1_amount,
    stableParams: stable,
    flags: n.flags,
  }
  const {
    id: o,
    token0Id: v,
    token0AmountRaw: t0amnt,
    fees: m,
    token1Id: d,
    token1AmountRaw: g,
    stableParams: y,
    flags: b,
  } = e
  return {
    id: o,
    token0Id: v,
    token0Amount: convertCoinFromUDenomV2(t0amnt, t0decimals),
    token1Id: d,
    token1Amount: convertCoinFromUDenomV2(g, t1decimals),
    stableParams: y,
    fees: m,
    flags: b
  };
}

export function calculateBestShadeSwapRoutes({
  inputTokenAmount: tokenAmount,
  startingTokenId: startingTokenId,
  endingTokenId: endingTokenId,
  maxHops: maxHops,
  isReverse: h = !1,
  shadePairs,
}: {
  inputTokenAmount: Amount,
    startingTokenId: string,
    endingTokenId: string,
    maxHops: number,
    shadePairs: Record<string, ShadeRoutePoolEssential>,
    isReverse: boolean,
}): ShadeSwapRoute[] {
  const shadeCalc = new ShadeCalc(shadePairs)
  const rawPaths = findShadePaths({
    startingTokenId,
    endingTokenId,
    maxHops,
    pools: shadePairs,
  });
  if (rawPaths.length === 0) {
    return [];
  }
  if (!h) {
    return rawPaths
      .reduce((agg, currentPath) => {
        try {
          const pathCalculation = shadeCalc.calculatePathOutcome({
            startingTokenAmount: tokenAmount,
            startingTokenId,
            path: currentPath,
          });
          return agg.push(pathCalculation),
            agg;
        } catch (err) {
          return agg;
        }
      }, [])
      .sort((d, o) => d.quoteOutputAmount.isGreaterThan(o.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(o.quoteOutputAmount) ? 1 : 0);
  } else {
    const $ = rawPaths.reduce((d, path) => {
        try {
          const D = shadeCalc.calculatePathQuotaByEnding({
            endingTokenAmount: tokenAmount,
            endingTokenId,
            path,
          });
          return d.push(D),
            d;
        } catch (err) {
          return d;
        }
      }
      , []);
    if ($.length === 0) {
      return [];
    }
    const F = $.reduce((d, o) => d.inputAmount.isLessThan(o.inputAmount) ? d : o, $[0])
      , P = F.inputAmount;
    return rawPaths.map(path => shadeCalc.calculatePathOutcome({
      startingTokenAmount: P,
      startingTokenId,
      path,
    })).map(d => JSON.stringify(d.route) === JSON.stringify(F.route) ? F : d)
      .sort((d, o) => JSON.stringify(d.route) === JSON.stringify(F.route) ? -1 : JSON.stringify(o.route) === JSON.stringify(F.route) ? 1 : d.quoteOutputAmount.isGreaterThan(o.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(o.quoteOutputAmount) ? 1 : 0);
  }
}


export const convertCoinToUDenomV2 = (input: string | number | BigNumber, decimals: number): Amount => {
  return BigNumber(typeof input === 'string' || typeof input === 'number' ?
    BigNumber(input)
      .multipliedBy(BigNumber(10).pow(decimals)) :
    BigNumber(input.toString()).multipliedBy(BigNumber(10).pow(decimals)).toFixed(0));
};
export const convertCoinFromUDenomV2 = (input: string | BigNumber,decimals:number): Amount =>(BigNumber.config({
  DECIMAL_PLACES: 18
}),BigNumber(input.toString()).dividedBy(BigNumber(10).pow(decimals)))
