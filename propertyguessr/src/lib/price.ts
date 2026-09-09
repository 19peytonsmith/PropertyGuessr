// src/lib/price.ts
//
// The one mapping between a slider position and a price. The slider is 1000
// steps wide, spread over four linear bands so the mid range - where most
// listings sit - gets most of the track.
//
// Kept in one place because the score is `priceAt` of a guess: a second copy
// that drifted would score guesses against a track the player never saw.

export const MIN_PRICE = 0;
export const MAX_PRICE = 20_000_000;

export const SLIDER_MIN = 0;
export const SLIDER_MAX = 1000;

// slider position -> price. Bands: 10% of the track to $0-100K, 50% to
// $100K-1M, 30% to $1M-5M, 10% to $5M-20M.
export function priceAt(position: number): number {
  if (position <= 100) return (position / 100) * 100_000;
  if (position <= 600)
    return 100_000 + ((position - 100) / 500) * (1_000_000 - 100_000);
  if (position <= 900)
    return 1_000_000 + ((position - 600) / 300) * (5_000_000 - 1_000_000);
  return 5_000_000 + ((position - 900) / 100) * (20_000_000 - 5_000_000);
}

// price -> slider position, the exact inverse of `priceAt`. Fractional on
// purpose: a whole step is worth $1,000 at the bottom of the track and
// $150,000 at the top, so rounding here would quantise a typed price.
export function positionAt(price: number): number {
  if (price <= 100_000) return (price / 100_000) * 100;
  if (price <= 1_000_000)
    return 100 + ((price - 100_000) / (1_000_000 - 100_000)) * 500;
  if (price <= 5_000_000)
    return 600 + ((price - 1_000_000) / (5_000_000 - 1_000_000)) * 300;
  return 900 + ((price - 5_000_000) / (20_000_000 - 5_000_000)) * 100;
}

/** The whole dollars a position reads as. `priceAt` inverts every one of them. */
export const dollarsAt = (position: number): number =>
  Math.round(priceAt(position));

export const clampPrice = (price: number): number =>
  Math.min(MAX_PRICE, Math.max(MIN_PRICE, price));

/** Digits only, with a lone leading zero kept and any others dropped. */
export const digitsOf = (text: string): string =>
  text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

export const groupDigits = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
