"use client";

import React from "react";
import Button from "@mui/material/Button";

interface SubmitButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export default function SubmitButton({ onClick, children }: SubmitButtonProps) {
  return (
    <Button
      className="submit-go-btn px-5 py-2"
      variant="contained"
      onClick={onClick}
    >
      <span className="btn-text">{children}</span>
    </Button>
  );
}
