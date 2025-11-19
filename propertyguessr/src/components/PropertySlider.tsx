// src/components/PropertySlider.tsx
"use client";

import * as React from "react";
import Slider, { SliderProps } from "@mui/material/Slider";
import PriceIndicators from "./PriceIndicators";

type PropertySliderProps = {
  value: number | number[];
  onChange: NonNullable<SliderProps["onChange"]>;
  color?: SliderProps["color"];
  disabled?: boolean;
  onSubmit?: () => void;
  isCanada?: boolean;
};

function calculateValue(v: number): number {
  // Linear segments - more space for mid-to-high range
  if (v <= 100) {
    // 0 to 100: $0 to $100K (10% of slider)
    return (v / 100) * 100_000;
  } else if (v <= 600) {
    // 100 to 600: $100K to $1M (50% of slider)
    return 100_000 + ((v - 100) / 500) * (1_000_000 - 100_000);
  } else if (v <= 900) {
    // 600 to 900: $1M to $5M (30% of slider)
    return 1_000_000 + ((v - 600) / 300) * (5_000_000 - 1_000_000);
  } else {
    // 900 to 1000: $5M to $20M (10% of slider)
    return 5_000_000 + ((v - 900) / 100) * (20_000_000 - 5_000_000);
  }
}

function calculateSliderValue(price: number): number {
  // Convert price back to slider value (inverse of calculateValue)
  if (price <= 100_000) {
    return (price / 100_000) * 100;
  } else if (price <= 1_000_000) {
    return 100 + ((price - 100_000) / (1_000_000 - 100_000)) * 500;
  } else if (price <= 5_000_000) {
    return 600 + ((price - 1_000_000) / (5_000_000 - 1_000_000)) * 300;
  } else {
    return 900 + ((price - 5_000_000) / (20_000_000 - 5_000_000)) * 100;
  }
}

// prettyValue and marks are generated per-instance so they can use
// the currency prefix (USD vs CAD)

export default function PropertySlider({
  value,
  onChange,
  color = "primary",
  disabled = false,
  onSubmit,
  isCanada = false,
}: PropertySliderProps) {
  const currencyPrefix = isCanada ? "C$" : "$";

  const prettyValue = (v: number): string => {
    const money = calculateValue(v);
    return `${currencyPrefix}${Math.round(money).toLocaleString("en-US")}`;
  };

  const marks: NonNullable<SliderProps["marks"]> = [
    { value: 0, label: `${currencyPrefix}0` },
    { value: 100, label: `${currencyPrefix}100K` },
    { value: 600, label: `${currencyPrefix}1M` },
    { value: 900, label: `${currencyPrefix}5M` },
    { value: 1000, label: `${currencyPrefix}20M` },
  ];
  const isRange = Array.isArray(value);
  const topOffset = isRange ? 10 : 0;
  const [inputValue, setInputValue] = React.useState("");
  const [isOverLimit, setIsOverLimit] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleSliderChange: SliderProps["onChange"] = (
    event,
    newValue,
    activeThumb
  ) => {
    onChange(event, newValue, activeThumb);
    // Show tooltip when using keyboard
    if (event.type === "keydown") {
      setIsFocused(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ""); // Only allow digits
    setInputValue(val);

    const price = parseInt(val, 10);

    // Check if over limit
    if (!isNaN(price) && price > 20_000_000) {
      setIsOverLimit(true);
      // Reset the animation after it completes
      setTimeout(() => setIsOverLimit(false), 500);
    } else {
      setIsOverLimit(false);
    }

    // Dynamically update slider as user types
    if (!isNaN(price) && price >= 0) {
      // Clamp between 0 and 20M
      const clampedPrice = Math.min(20_000_000, price);
      const sliderVal = calculateSliderValue(clampedPrice);

      // Update the slider value
      if (isRange) {
        onChange(new Event("change"), [sliderVal, value[1]], 0);
      } else {
        onChange(new Event("change"), sliderVal, 0);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Blur the input to remove focus
      e.currentTarget.blur();
      // Trigger submit if callback provided and not disabled
      if (onSubmit && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className={isRange ? "relative pt-9" : "relative"}>
      {isRange && (
        <PriceIndicators
          value={value as [number, number]}
          prettyValue={prettyValue}
          chosenColor={"var(--price-chosen)"}
          actualColor={"var(--price-actual)"}
          top={topOffset}
        />
      )}
      <Slider
        color={color}
        aria-label="Property price"
        valueLabelDisplay={isFocused ? "on" : "auto"}
        marks={marks}
        min={0}
        max={1000}
        valueLabelFormat={prettyValue}
        value={value}
        onChange={handleSliderChange}
        onMouseDown={() => setIsFocused(false)}
        onTouchStart={() => setIsFocused(false)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        slotProps={{
          thumb: {
            onFocus: () => setIsFocused(true),
            onBlur: () => setIsFocused(false),
          },
        }}
      />

      {!isRange && (
        <div className="mt-3 flex items-center gap-1.5 justify-end precise-input-container">
          <label className="text-sm font-medium text-[var(--text)]">
            {currencyPrefix}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Set amount"
            disabled={disabled}
            className={`precise-input px-2.5 py-1.5 text-sm border border-[var(--accent)] rounded-md w-[120px] bg-[var(--card-bg)] text-[var(--text)] outline-none ${isOverLimit ? "over-limit" : ""}`}
            onFocus={(e) => {
              if (!isOverLimit) {
                e.target.style.borderColor = "var(--btn-primary)";
                e.target.style.boxShadow =
                  "0 0 0 2px color-mix(in srgb, var(--btn-primary) 20%, transparent)";
              }
            }}
            onBlur={(e) => {
              if (!isOverLimit) {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "none";
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
