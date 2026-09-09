// src/components/PropertySlider.tsx
"use client";

import * as React from "react";
import BubbleSlider, {
  type BubbleChange,
  type BubbleMark,
} from "./BubbleSlider";
import {
  MAX_PRICE,
  SLIDER_MAX,
  SLIDER_MIN,
  clampPrice,
  digitsOf,
  dollarsAt,
  groupDigits,
  positionAt,
} from "@/lib/price";

type PropertySliderProps = {
  value: number | number[];
  onChange: BubbleChange;
  color?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  isCanada?: boolean;
};

export default function PropertySlider({
  value,
  onChange,
  color = "primary",
  disabled = false,
  onSubmit,
  isCanada = false,
}: PropertySliderProps) {
  const currencyPrefix = isCanada ? "C$" : "$";

  const prettyValue = (position: number): string =>
    `${currencyPrefix}${dollarsAt(position).toLocaleString("en-US")}`;

  // Held stable: the slider measures these to decide which ones a narrow track
  // has room for, and a fresh array each render would re-run that measurement.
  const marks: BubbleMark[] = React.useMemo(
    () => [
      { value: 0, label: `${currencyPrefix}0` },
      { value: 100, label: `${currencyPrefix}100K` },
      { value: 600, label: `${currencyPrefix}1M` },
      { value: 900, label: `${currencyPrefix}5M` },
      { value: 1000, label: `${currencyPrefix}20M` },
    ],
    [currencyPrefix],
  );

  const isRange = Array.isArray(value);
  const position = isRange ? value[0]! : value;

  const [inputValue, setInputValue] = React.useState("");
  const [isOverLimit, setIsOverLimit] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  // The price the box last put on the slider. Anything else the slider lands
  // on came from a drag, an arrow key or a new round, and the box must follow.
  const pushedRef = React.useRef<number | null>(null);
  // Where the caret sits, counted in digits, so regrouping cannot move it.
  const caretRef = React.useRef<number | null>(null);

  const pushPrice = (price: number) => {
    pushedRef.current = price;
    const next = positionAt(price);
    onChange(new Event("change"), isRange ? [next, value[1]!] : next, 0);
  };

  React.useEffect(() => {
    if (isRange) {
      // The reveal closes the guess, so the next round opens on a clean box.
      setInputValue("");
      pushedRef.current = null;
      return;
    }
    const price = dollarsAt(position);
    if (price === pushedRef.current) return; // the box put it there itself
    pushedRef.current = price;
    // An untouched box keeps its placeholder: the bubble is the readout, and
    // the box is only ever filled with a price it has already been given.
    setInputValue((prev) => (prev === "" ? "" : groupDigits(String(price))));
  }, [position, isRange]);

  // React writes the grouped text back into the box, which parks the caret at
  // the end. Put it back on the digit the typist was on.
  React.useLayoutEffect(() => {
    const el = inputRef.current;
    const want = caretRef.current;
    caretRef.current = null;
    if (!el || want === null) return;

    let seen = 0;
    let i = 0;
    while (i < el.value.length && seen < want) {
      if (el.value[i]! >= "0" && el.value[i]! <= "9") seen += 1;
      i += 1;
    }
    el.setSelectionRange(i, i);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    caretRef.current = digitsOf(raw.slice(0, caret)).length;

    const digits = digitsOf(raw);
    setInputValue(groupDigits(digits));

    if (digits === "") {
      setIsOverLimit(false);
      return; // an emptied box leaves the slider where it is
    }

    const price = Number(digits);
    setIsOverLimit(price > MAX_PRICE);
    pushPrice(clampPrice(price));
  };

  // Whatever survived typing - a stray leading zero, a price over the cap -
  // is settled here, so a box left alone always reads what the slider holds.
  const handleBlur = () => {
    setIsOverLimit(false);
    if (inputValue !== "") {
      setInputValue(groupDigits(String(dollarsAt(position))));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.currentTarget.blur();
    if (onSubmit && !disabled) onSubmit();
  };

  return (
    <div className="relative">
      <BubbleSlider
        value={value}
        onChange={onChange}
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        marks={marks}
        format={prettyValue}
        disabled={disabled}
        color={color}
        ariaLabel="Property price"
      />

      {!isRange && (
        <div className="mt-1 flex items-center gap-1.5 justify-end precise-input-container">
          <label
            className="text-sm font-medium text-[var(--text)]"
            htmlFor="precise-price"
          >
            {currencyPrefix}
          </label>
          <input
            id="precise-price"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Set amount"
            disabled={disabled}
            aria-label="Set an exact property price"
            className={`precise-input px-2.5 py-1.5 text-sm border border-[var(--accent)] rounded-md w-[140px] bg-[var(--card-bg)] text-[var(--text)] outline-none ${isOverLimit ? "over-limit" : ""}`}
            onFocus={(e) => {
              if (!isOverLimit) {
                e.target.style.borderColor = "var(--btn-primary)";
                e.target.style.boxShadow =
                  "0 0 0 2px color-mix(in srgb, var(--btn-primary) 20%, transparent)";
              }
            }}
            onBlur={(e) => {
              handleBlur();
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
