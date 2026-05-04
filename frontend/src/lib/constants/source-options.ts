export const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual Entry" },
  { value: "WEBSITE", label: "Website" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "ZALO", label: "Zalo" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone Call" },
  { value: "REFERRAL", label: "Referral" },
  { value: "EVENT", label: "Event" },
  { value: "IMPORT_CSV", label: "Import CSV" },
  { value: "CHATBOT", label: "Chatbot" },
  { value: "API", label: "API" },
  { value: "CONVERTED_LEAD", label: "Converted Lead" },
  { value: "OTHER", label: "Other" },
] as const;

export const getSourceLabel = (source?: string) =>
  SOURCE_OPTIONS.find((option) => option.value === source)?.label || source || "-";
