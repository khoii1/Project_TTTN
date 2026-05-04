"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { accountsApi } from "@/features/accounts/accounts.api";
import { Account } from "@/features/accounts/accounts.types";
import { casesApi } from "@/features/cases/cases.api";
import { Case } from "@/features/cases/cases.types";
import { contactsApi } from "@/features/contacts/contacts.api";
import { Contact } from "@/features/contacts/contacts.types";
import { leadsApi } from "@/features/leads/leads.api";
import { Lead } from "@/features/leads/leads.types";
import { opportunitiesApi } from "@/features/opportunities/opportunities.api";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { tasksApi } from "@/features/tasks/tasks.api";
import { Task } from "@/features/tasks/tasks.types";

export type EntityReferenceType =
  | "LEAD"
  | "ACCOUNT"
  | "CONTACT"
  | "OPPORTUNITY"
  | "TASK"
  | "CASE"
  | "NOTE";

type EntityReferenceDisplayProps = {
  entityType: EntityReferenceType;
  entityId?: string;
  link?: boolean;
  fallback?: ReactNode;
};

type EntityRecord = Lead | Account | Contact | Opportunity | Task | Case;

const labelCache = new Map<string, Promise<string>>();

const getFullName = (firstName?: string, lastName?: string) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

const getEntityPath = (entityType: EntityReferenceType, entityId: string) => {
  switch (entityType) {
    case "LEAD":
      return `/dashboard/leads/${entityId}`;
    case "ACCOUNT":
      return `/dashboard/accounts/${entityId}`;
    case "CONTACT":
      return `/dashboard/contacts/${entityId}`;
    case "OPPORTUNITY":
      return `/dashboard/opportunities/${entityId}`;
    case "TASK":
      return `/dashboard/tasks/${entityId}`;
    case "CASE":
      return `/dashboard/cases/${entityId}`;
    case "NOTE":
      return undefined;
  }
};

const fetchEntity = async (
  entityType: EntityReferenceType,
  entityId: string,
): Promise<EntityRecord> => {
  switch (entityType) {
    case "LEAD":
      return leadsApi.getById(entityId);
    case "ACCOUNT":
      return accountsApi.getById(entityId);
    case "CONTACT":
      return contactsApi.getById(entityId);
    case "OPPORTUNITY":
      return opportunitiesApi.getById(entityId);
    case "TASK":
      return tasksApi.getById(entityId);
    case "CASE":
      return casesApi.getById(entityId);
    case "NOTE":
      throw new Error("Note detail endpoint is not available");
  }
};

const getEntityLabel = (
  entityType: EntityReferenceType,
  record: EntityRecord,
) => {
  switch (entityType) {
    case "LEAD": {
      const lead = record as Lead;
      const name = getFullName(lead.firstName, lead.lastName);
      return [name, lead.company].filter(Boolean).join(" · ");
    }
    case "ACCOUNT":
      return (record as Account).name;
    case "CONTACT": {
      const contact = record as Contact;
      return getFullName(contact.firstName, contact.lastName);
    }
    case "OPPORTUNITY":
      return (record as Opportunity).name;
    case "TASK":
      return (record as Task).subject;
    case "CASE":
      return (record as Case).subject;
    case "NOTE":
      return "Note";
  }
};

const loadEntityLabel = (
  entityType: EntityReferenceType,
  entityId: string,
) => {
  const cacheKey = `${entityType}:${entityId}`;
  const cached = labelCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetchEntity(entityType, entityId).then((record) => {
    const label = getEntityLabel(entityType, record);
    return label || "Record not found";
  });
  labelCache.set(cacheKey, promise);
  return promise;
};

export function EntityReferenceDisplay({
  entityType,
  entityId,
  link,
  fallback = "-",
}: EntityReferenceDisplayProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(entityId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!entityId) return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
    });

    loadEntityLabel(entityType, entityId)
      .then((value) => {
        if (!cancelled) setLabel(value);
      })
      .catch(() => {
        if (!cancelled) {
          setLabel(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  if (!entityId) return <>{fallback}</>;
  if (loading) return <>Loading...</>;
  if (error || !label) return <>Record not found</>;

  const href = getEntityPath(entityType, entityId);
  if (link && href) {
    return (
      <Link href={href} className="text-blue-600 hover:text-blue-800">
        {label}
      </Link>
    );
  }

  return <>{label}</>;
}
