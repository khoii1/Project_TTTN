import { SOURCE_LABELS } from "./vi-labels";

export const SOURCE_OPTIONS = [
  { value: "MANUAL", label: SOURCE_LABELS.MANUAL },
  { value: "WEBSITE", label: SOURCE_LABELS.WEBSITE },
  { value: "FACEBOOK", label: SOURCE_LABELS.FACEBOOK },
  { value: "GOOGLE_ADS", label: SOURCE_LABELS.GOOGLE_ADS },
  { value: "ZALO", label: SOURCE_LABELS.ZALO },
  { value: "EMAIL", label: SOURCE_LABELS.EMAIL },
  { value: "PHONE", label: SOURCE_LABELS.PHONE },
  { value: "REFERRAL", label: SOURCE_LABELS.REFERRAL },
  { value: "EVENT", label: SOURCE_LABELS.EVENT },
  { value: "IMPORT_CSV", label: SOURCE_LABELS.IMPORT_CSV },
  { value: "CHATBOT", label: SOURCE_LABELS.CHATBOT },
  { value: "API", label: SOURCE_LABELS.API },
  { value: "CONVERTED_LEAD", label: SOURCE_LABELS.CONVERTED_LEAD },
  { value: "OTHER", label: SOURCE_LABELS.OTHER },
] as const;

export const getSourceLabel = (source?: string) =>
  SOURCE_OPTIONS.find((option) => option.value === source)?.label ||
  source ||
  "-";
