import { memo, useState, useCallback } from "react";
import { CardHeader, Input } from "../../index";

interface ContactInfo {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

interface ContactStepProps {
  contact: ContactInfo;
  setContact: (contact: ContactInfo) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactStep = memo(function ContactStep({ contact, setContact }: ContactStepProps) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validateUrl = useCallback((url: string): string | undefined => {
    if (!url.trim()) return undefined;
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return undefined;
    } catch {
      return "Please enter a valid URL";
    }
  }, []);

  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address";
    return undefined;
  }, []);

  const validatePhone = useCallback((phone: string): string | undefined => {
    if (!phone.trim()) return undefined;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return "Phone must be at least 10 digits";
    return undefined;
  }, []);

  const handleBlur = useCallback((field: string, value: string) => {
    let error: string | undefined;
    if (field === "email") error = validateEmail(value);
    else if (field === "phone") error = validatePhone(value);
    else if (["linkedin", "github", "website"].includes(field)) error = validateUrl(value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, [validateEmail, validatePhone, validateUrl]);

  return (
    <div className="space-y-6">
      <CardHeader
        title="Contact Information"
        subtitle="How can employers reach you?"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
          placeholder="John Doe"
          maxLength={100}
          required
          error={!contact.name.trim() ? "Name is required" : undefined}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
          onBlur={() => handleBlur("email", contact.email)}
          placeholder="john@example.com"
          maxLength={255}
          required
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Phone"
          type="tel"
          value={contact.phone || ""}
          onChange={(e) => setContact({ ...contact, phone: e.target.value || null })}
          onBlur={() => handleBlur("phone", contact.phone || "")}
          placeholder="+1 (555) 123-4567"
          maxLength={20}
          error={errors.phone}
          hint="Include country code for best results"
          autoComplete="tel"
        />
        <Input
          label="Location"
          type="text"
          value={contact.location || ""}
          onChange={(e) => setContact({ ...contact, location: e.target.value || null })}
          placeholder="San Francisco, CA"
          maxLength={100}
          hint="City, State or Country"
          autoComplete="address-level2"
        />
        <Input
          label="LinkedIn"
          type="url"
          value={contact.linkedin || ""}
          onChange={(e) => setContact({ ...contact, linkedin: e.target.value || null })}
          onBlur={() => handleBlur("linkedin", contact.linkedin || "")}
          placeholder="linkedin.com/in/johndoe"
          maxLength={255}
          error={errors.linkedin}
          autoComplete="url"
        />
        <Input
          label="GitHub"
          type="url"
          value={contact.github || ""}
          onChange={(e) => setContact({ ...contact, github: e.target.value || null })}
          onBlur={() => handleBlur("github", contact.github || "")}
          placeholder="github.com/johndoe"
          maxLength={255}
          error={errors.github}
          autoComplete="url"
        />
        <div className="md:col-span-2">
          <Input
            label="Website"
            type="url"
            value={contact.website || ""}
            onChange={(e) => setContact({ ...contact, website: e.target.value || null })}
            onBlur={() => handleBlur("website", contact.website || "")}
            placeholder="https://johndoe.com"
            maxLength={255}
            error={errors.website}
            autoComplete="url"
          />
        </div>
      </div>
    </div>
  );
});

export default ContactStep;
