"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import "../../styles/contactme.css";
import ThemeToggle from "@/components/ThemeToggle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

export default function ContactMe() {
  const [isSending, setIsSending] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [invalidFields, setInvalidFields] = useState<{
    name: boolean;
    email: boolean;
    message: boolean;
  }>({
    name: false,
    email: false,
    message: false,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear invalid state for this field when user starts typing
    if (invalidFields[id as keyof typeof invalidFields]) {
      setInvalidFields((prev) => ({ ...prev, [id]: false }));
    }
  };

  const validateForm = () => {
    const { name, email, message } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors = {
      name: name.trim().length === 0,
      email: email.trim().length === 0 || !emailRegex.test(email),
      message: message.trim().length === 0,
    };

    setInvalidFields(errors);

    return !errors.name && !errors.email && !errors.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSending(true);
      setSendError(false);
      setSendSuccess(false);

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        // Success - show send animation
        setTimeout(() => {
          setIsSending(false);
          setSendSuccess(true);
          // Reset form
          setFormData({ name: "", email: "", message: "" });
          // Hide success message after 5 seconds
          setTimeout(() => setSendSuccess(false), 5000);
        }, 1200);
      } catch (error) {
        console.error("Error sending message:", error);
        setIsSending(false);
        setSendError(true);
        // Hide error message after 5 seconds
        setTimeout(() => setSendError(false), 5000);
      }
    } else {
      // Show invalid state
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 500);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-actions">
        <Link href="/" className="contact-button">
          <span className="back-icon">
            <FontAwesomeIcon icon={faArrowLeft} />
          </span>
          Back home
        </Link>
        <ThemeToggle />
      </div>
      <Card className="rounded-xl">
        <div className="contact-card">
          <h2 className="card-title">Feedback & Suggestions</h2>
          <hr className="contact-divider" />
          <p className="contact-description text-[0.9rem]">
            Have tips or suggestions to improve the game or found a bug? Want to
            have houses from your city featured in the game. I&apos;d love to
            hear from you!
          </p>
          {sendSuccess && (
            <div className="alert alert-success text-center">
              ✅ Message sent successfully! Thanks for your feedback!
            </div>
          )}
          {sendError && (
            <div className="alert alert-danger text-center">
              ❌ Failed to send message. Please try again or email me directly
              at{" "}
              <a href="mailto:19peytonsmith@gmail.com">
                19peytonsmith@gmail.com
              </a>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                className={`form-control contact-input ${
                  invalidFields.name ? "is-invalid" : ""
                }`}
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={handleInputChange}
              />
              {invalidFields.name && (
                <div className="invalid-feedback d-block">
                  Please enter your name.
                </div>
              )}
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className={`form-control contact-input ${
                  invalidFields.email ? "is-invalid" : ""
                }`}
                id="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
              {invalidFields.email && (
                <div className="invalid-feedback d-block">
                  Please enter a valid email address.
                </div>
              )}
            </div>
            <div className="mb-3">
              <label htmlFor="message" className="form-label">
                Message
              </label>
              <textarea
                className={`form-control contact-input ${
                  invalidFields.message ? "is-invalid" : ""
                }`}
                id="message"
                rows={5}
                placeholder="Your message..."
                value={formData.message}
                onChange={handleInputChange}
              ></textarea>
              {invalidFields.message && (
                <div className="invalid-feedback d-block">
                  Please enter your message.
                </div>
              )}
            </div>
            <button
              type="submit"
              className={`btn btn-primary contact-submit ${
                isInvalid ? "invalid" : ""
              }`}
            >
              Send Message
              <span className={`send-icon ${isSending ? "sending" : ""}`}>
                <FontAwesomeIcon icon={faPaperPlane} />
              </span>
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
