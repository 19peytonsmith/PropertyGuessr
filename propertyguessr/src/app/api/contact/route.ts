import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { ContactEmailTemplate } from "@/components/ContactEmailTemplate";
import React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    // Validate the input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "PropertyGuessr Contact Form <onboarding@resend.dev>",
      to: ["19peytonsmith@gmail.com"],
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      react: React.createElement(ContactEmailTemplate, {
        name,
        email,
        message,
      }) as React.ReactElement,
    });

    if (error) {
      console.error("Error sending email:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in contact API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
