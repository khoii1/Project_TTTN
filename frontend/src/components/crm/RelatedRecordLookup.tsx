"use client";

import { useEffect, useRef, useState } from "react";
import { Select, App } from "antd";
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
import {
  EMPTY_STATE_LABELS,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/constants/vi-labels";
import { formatVndAmount } from "@/lib/utils/currency";

export type RelatedType =
  | "LEAD"
  | "ACCOUNT"
  | "CONTACT"
  | "OPPORTUNITY"
  | "CASE";

interface RelatedRecordLookupProps {
  relatedType?: string;
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
}

type RelatedRecord = Lead | Account | Contact | Opportunity | Case;

const getRecordLabel = (relatedType: string, record: RelatedRecord) => {
  switch (relatedType) {
    case "LEAD": {
      const lead = record as Lead;
      return [lead.lastName, lead.company, lead.email || lead.phone]
        .filter(Boolean)
        .join(" - ");
    }
    case "ACCOUNT": {
      const account = record as Account;
      return [account.name, account.phone || account.website]
        .filter(Boolean)
        .join(" - ");
    }
    case "CONTACT": {
      const contact = record as Contact;
      return [
        [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        contact.email || contact.phone,
      ]
        .filter(Boolean)
        .join(" - ");
    }
    case "OPPORTUNITY": {
      const opportunity = record as Opportunity;
      return [
        opportunity.name,
        getStatusLabel(opportunity.stage),
        opportunity.amount ? formatVndAmount(opportunity.amount) : undefined,
      ]
        .filter(Boolean)
        .join(" - ");
    }
    case "CASE": {
      const crmCase = record as Case;
      return [
        crmCase.subject,
        getStatusLabel(crmCase.status),
        getPriorityLabel(crmCase.priority),
      ]
        .filter(Boolean)
        .join(" - ");
    }
    default:
      return record.id;
  }
};

const searchRecords = async (relatedType: string, search: string) => {
  const params = { search, page: 1, limit: 10 };

  switch (relatedType) {
    case "LEAD":
      return leadsApi.getAll(params);
    case "ACCOUNT":
      return accountsApi.getAll(params);
    case "CONTACT":
      return contactsApi.getAll(params);
    case "OPPORTUNITY":
      return opportunitiesApi.getAll(params);
    case "CASE":
      return casesApi.getAll(params);
    default:
      return [];
  }
};

const getRecordById = async (relatedType: string, id: string) => {
  switch (relatedType) {
    case "LEAD":
      return leadsApi.getById(id);
    case "ACCOUNT":
      return accountsApi.getById(id);
    case "CONTACT":
      return contactsApi.getById(id);
    case "OPPORTUNITY":
      return opportunitiesApi.getById(id);
    case "CASE":
      return casesApi.getById(id);
    default:
      return null;
  }
};

export const RelatedRecordLookup = ({
  relatedType,
  value,
  onChange,
  disabled,
}: RelatedRecordLookupProps) => {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    [],
  );
  const previousTypeRef = useRef<string | undefined>(relatedType);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      previousTypeRef.current = relatedType;
      return;
    }

    if (previousTypeRef.current !== relatedType) {
      previousTypeRef.current = relatedType;
      setSearch("");
      setOptions([]);
      onChange?.(undefined);
    }
  }, [onChange, relatedType]);

  useEffect(() => {
    if (!relatedType || !value) {
      return;
    }

    const hasSelectedOption = options.some((option) => option.value === value);
    if (hasSelectedOption) {
      return;
    }

    getRecordById(relatedType, value)
      .then((record) => {
        if (!record) {
          setOptions((currentOptions) => [
            { value, label: EMPTY_STATE_LABELS.recordNotFound },
            ...currentOptions.filter((option) => option.value !== value),
          ]);
          return;
        }

        setOptions((currentOptions) => [
          { value, label: getRecordLabel(relatedType, record) },
          ...currentOptions.filter((option) => option.value !== value),
        ]);
      })
      .catch(() => {
        setOptions((currentOptions) => [
          { value, label: EMPTY_STATE_LABELS.recordNotFound },
          ...currentOptions.filter((option) => option.value !== value),
        ]);
      });
  }, [options, relatedType, value]);

  useEffect(() => {
    if (!relatedType || disabled) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const records = await searchRecords(relatedType, search);
        setOptions(
          records.map((record) => ({
            value: record.id,
            label: getRecordLabel(relatedType, record),
          })),
        );
      } catch {
        message.warning("Không thể tải bản ghi liên quan");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [disabled, relatedType, search]);

  return (
    <Select
      allowClear
      showSearch
      disabled={disabled || !relatedType}
      filterOption={false}
      loading={loading}
      notFoundContent={
        loading ? "Đang tìm kiếm..." : EMPTY_STATE_LABELS.noRecords
      }
      options={options}
      placeholder={
        relatedType ? "Tìm bản ghi liên quan..." : "Chọn loại liên quan trước"
      }
      value={value}
      onChange={onChange}
      onSearch={setSearch}
    />
  );
};
