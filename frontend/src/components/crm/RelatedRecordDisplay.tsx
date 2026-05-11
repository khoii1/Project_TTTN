"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leadsApi } from "@/features/leads/leads.api";
import { accountsApi } from "@/features/accounts/accounts.api";
import { contactsApi } from "@/features/contacts/contacts.api";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { casesApi } from "@/features/cases/cases.api";
import { Lead } from "@/features/leads/leads.types";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { Case } from "@/features/cases/cases.types";
import { EMPTY_STATE_LABELS } from "@/lib/constants/vi-labels";

interface RelatedRecordDisplayProps {
  relatedType?: string;
  relatedId?: string;
  link?: boolean;
}

type RelatedRecord = Lead | Account | Contact | Opportunity | Case;

const getRelatedRecord = async (relatedType: string, relatedId: string) => {
  switch (relatedType) {
    case "LEAD":
      return leadsApi.getById(relatedId);
    case "ACCOUNT":
      return accountsApi.getById(relatedId);
    case "CONTACT":
      return contactsApi.getById(relatedId);
    case "OPPORTUNITY":
      return opportunitiesApi.getById(relatedId);
    case "CASE":
      return casesApi.getById(relatedId);
    default:
      return null;
  }
};

const getRecordLabel = (relatedType: string, record: RelatedRecord) => {
  switch (relatedType) {
    case "LEAD": {
      const lead = record as Lead;
      return [lead.lastName, lead.company].filter(Boolean).join(" - ");
    }
    case "ACCOUNT":
      return (record as Account).name;
    case "CONTACT": {
      const contact = record as Contact;
      return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    }
    case "OPPORTUNITY":
      return (record as Opportunity).name;
    case "CASE":
      return (record as Case).subject;
    default:
      return "";
  }
};

const getDetailPath = (relatedType: string, relatedId: string) => {
  switch (relatedType) {
    case "LEAD":
      return `/dashboard/leads/${relatedId}`;
    case "ACCOUNT":
      return `/dashboard/accounts/${relatedId}`;
    case "CONTACT":
      return `/dashboard/contacts/${relatedId}`;
    case "OPPORTUNITY":
      return `/dashboard/opportunities/${relatedId}`;
    case "CASE":
      return `/dashboard/cases/${relatedId}`;
    default:
      return "";
  }
};

export const RelatedRecordDisplay = ({
  relatedType,
  relatedId,
  link,
}: RelatedRecordDisplayProps) => {
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!relatedType || !relatedId) {
      return;
    }

    let isActive = true;

    const fetchRecord = async () => {
      try {
        setLoading(true);
        const record = await getRelatedRecord(relatedType, relatedId);

        if (!isActive) {
          return;
        }

        if (!record) {
          setLabel(EMPTY_STATE_LABELS.recordNotFound);
          return;
        }

        setLabel(
          getRecordLabel(relatedType, record) ||
            EMPTY_STATE_LABELS.recordNotFound,
        );
      } catch {
        if (isActive) {
          setLabel(EMPTY_STATE_LABELS.recordNotFound);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchRecord();

    return () => {
      isActive = false;
    };
  }, [relatedId, relatedType]);

  if (!relatedType || !relatedId) {
    return <span>-</span>;
  }

  if (loading) {
    return <span className="text-gray-500">{EMPTY_STATE_LABELS.loading}</span>;
  }

  if (!label || label === EMPTY_STATE_LABELS.recordNotFound) {
    return <span>{label || EMPTY_STATE_LABELS.recordNotFound}</span>;
  }

  if (!link) {
    return <span>{label}</span>;
  }

  return (
    <Link
      href={getDetailPath(relatedType, relatedId)}
      className="text-blue-600"
    >
      {label}
    </Link>
  );
};
