import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
} from "@react-email/components";

interface ContactEmailTemplateProps {
  name: string;
  email: string;
  message: string;
}

export const ContactEmailTemplate: React.FC<
  Readonly<ContactEmailTemplateProps>
> = ({ name, email, message }) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>🏠 New PropertyGuessr Feedback</Heading>
          <Text style={headerSubtitle}>
            You have received a new message from your contact form
          </Text>
        </Section>
        <Section style={content}>
          <Section style={field}>
            <Text style={fieldLabel}>FROM</Text>
            <Text style={fieldValue}>{name}</Text>
          </Section>
          <Section style={field}>
            <Text style={fieldLabel}>EMAIL ADDRESS</Text>
            <Text style={fieldValue}>
              <Link href={`mailto:${email}`} style={emailLink}>
                {email}
              </Link>
            </Text>
          </Section>
          <Section style={messageBox}>
            <Text style={fieldLabel}>MESSAGE</Text>
            <Text style={messageContent}>{message}</Text>
          </Section>
          <Text style={timestamp}>
            Received on{" "}
            {new Date().toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>
            This email was sent from the PropertyGuessr contact form.
            <br />
            Reply directly to this email to respond to {name}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  lineHeight: "1.6",
  color: "#333",
  backgroundColor: "#f4f4f4",
};

const container = {
  maxWidth: "600px",
  margin: "20px auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

const header = {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  padding: "30px 20px",
  textAlign: "center" as const,
};

const headerTitle = {
  margin: "0",
  fontSize: "24px",
  fontWeight: "600",
  color: "white",
};

const headerSubtitle = {
  margin: "5px 0 0 0",
  opacity: "0.9",
  fontSize: "14px",
  color: "white",
};

const content = {
  padding: "30px 20px",
};

const field = {
  marginBottom: "20px",
  padding: "15px",
  backgroundColor: "#f8f9fa",
  borderLeft: "4px solid #667eea",
  borderRadius: "4px",
};

const fieldLabel = {
  fontWeight: "600",
  color: "#667eea",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "5px",
  margin: "0 0 5px 0",
};

const fieldValue = {
  color: "#333",
  fontSize: "15px",
  wordWrap: "break-word" as const,
  margin: "0",
};

const emailLink = {
  color: "#667eea",
  textDecoration: "none",
};

const messageBox = {
  backgroundColor: "#f8f9fa",
  borderLeft: "4px solid #667eea",
  padding: "15px",
  borderRadius: "4px",
  marginTop: "20px",
};

const messageContent = {
  color: "#333",
  fontSize: "15px",
  lineHeight: "1.6",
  whiteSpace: "pre-wrap" as const,
  margin: "0",
};

const timestamp = {
  color: "#999",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "10px",
};

const footer = {
  backgroundColor: "#f8f9fa",
  padding: "20px",
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#666",
  borderTop: "1px solid #e0e0e0",
};

const footerText = {
  margin: "0",
  color: "#666",
  fontSize: "12px",
};
