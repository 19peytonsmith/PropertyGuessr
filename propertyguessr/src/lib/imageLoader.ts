/**
 * Loader for `next/image`.
 *
 * The site does not use Vercel's image optimizer. Once the plan's
 * transformation quota ran out, every `/_next/image` request returned HTTP 402
 * (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED), which broke every picture on the
 * site. `next.config.ts` sets `images.loader = "custom"`, so each `<Image>`
 * must pass this loader. That makes a forgotten image a build error instead of
 * a silent 402 in production.
 *
 * Zillow's CDN already resizes for free: the width lives in the
 * `cc_ft_<width>` token of the file name, so we rewrite that token to the
 * width the browser asks for. Files in `/public` are pre-compressed and pass
 * through untouched.
 *
 * Note: `images.loaderFile` would remove the per-image prop, but Turbopack
 * ignores that option in Next 15.5, so the prop is required.
 */

const ZILLOW_HOST = "photos.zillowstatic.com";

/** Widths that photos.zillowstatic.com serves for the `cc_ft_<width>` token. */
const ZILLOW_WIDTHS = [192, 384, 576, 768, 960, 1152, 1536];

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes(ZILLOW_HOST)) return src;

  const target =
    ZILLOW_WIDTHS.find((w) => w >= width) ??
    ZILLOW_WIDTHS[ZILLOW_WIDTHS.length - 1];

  return src.replace(/-cc_ft_\d+(\.[a-z]+)$/i, `-cc_ft_${target}$1`);
}
