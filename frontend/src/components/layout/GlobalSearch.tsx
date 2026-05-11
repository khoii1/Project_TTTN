"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { GlobalSearchResults } from "@/features/search/search.types";
import { globalSearch } from "@/features/search/search.api";
import { Lead } from "@/features/leads/leads.types";
import { Account } from "@/features/accounts/accounts.types";
import { Contact } from "@/features/contacts/contacts.types";
import { Opportunity } from "@/features/opportunities/opportunities.types";
import { Case } from "@/features/cases/cases.types";
import { Task } from "@/features/tasks/tasks.types";
import {
  EMPTY_STATE_LABELS,
  ENTITY_LABELS,
  getStatusLabel,
} from "@/lib/constants/vi-labels";

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

type SearchGroup = {
  key: keyof GlobalSearchResults;
  title: string;
  items: SearchItem[];
};

const emptyResults: GlobalSearchResults = {
  leads: [],
  accounts: [],
  contacts: [],
  opportunities: [],
  cases: [],
  tasks: [],
};

const fullName = (firstName?: string, lastName?: string) =>
  [firstName, lastName].filter(Boolean).join(" ").trim();

const mapGroups = (results: GlobalSearchResults): SearchGroup[] => [
  {
    key: "leads",
    title: ENTITY_LABELS.leads,
    items: results.leads.map((lead: Lead) => ({
      id: lead.id,
      title: fullName(lead.firstName, lead.lastName) || lead.lastName,
      subtitle: lead.company,
      href: `/dashboard/leads/${lead.id}`,
    })),
  },
  {
    key: "accounts",
    title: ENTITY_LABELS.accounts,
    items: results.accounts.map((account: Account) => ({
      id: account.id,
      title: account.name,
      href: `/dashboard/accounts/${account.id}`,
    })),
  },
  {
    key: "contacts",
    title: ENTITY_LABELS.contacts,
    items: results.contacts.map((contact: Contact) => ({
      id: contact.id,
      title: fullName(contact.firstName, contact.lastName) || contact.lastName,
      subtitle: contact.email || contact.phone,
      href: `/dashboard/contacts/${contact.id}`,
    })),
  },
  {
    key: "opportunities",
    title: ENTITY_LABELS.opportunities,
    items: results.opportunities.map((opportunity: Opportunity) => ({
      id: opportunity.id,
      title: opportunity.name,
      subtitle: getStatusLabel(opportunity.stage),
      href: `/dashboard/opportunities/${opportunity.id}`,
    })),
  },
  {
    key: "cases",
    title: ENTITY_LABELS.cases,
    items: results.cases.map((crmCase: Case) => ({
      id: crmCase.id,
      title: crmCase.subject,
      subtitle: getStatusLabel(crmCase.status),
      href: `/dashboard/cases/${crmCase.id}`,
    })),
  },
  {
    key: "tasks",
    title: ENTITY_LABELS.tasks,
    items: results.tasks.map((task: Task) => ({
      id: task.id,
      title: task.subject,
      subtitle: getStatusLabel(task.status),
      href: `/dashboard/tasks/${task.id}`,
    })),
  },
];

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => mapGroups(results).filter((group) => group.items.length > 0),
    [results],
  );
  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const data = await globalSearch(query.trim());
        if (!cancelled) {
          setResults(data);
          setOpen(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults(emptyResults);
    router.push(href);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setOpen(false);
      setLoading(false);
      setResults(emptyResults);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <Input
        allowClear
        prefix={<SearchOutlined className="text-gray-400" />}
        placeholder="Tìm kiếm toàn hệ thống..."
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          if (canSearch) setOpen(true);
        }}
        className="bg-gray-50 shadow-sm"
      />
      {open && canSearch && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500">
              <Spin size="small" />
              <span>Đang tìm kiếm...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              {EMPTY_STATE_LABELS.noResults}
            </div>
          ) : (
            <div className="py-2">
              {groups.map((group) => (
                <section key={group.key} className="py-1">
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.title}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={`${group.key}-${item.id}`}
                      type="button"
                      className="block w-full px-3 py-2 text-left transition hover:bg-blue-50"
                      onClick={() => handleSelect(item.href)}
                    >
                      <div className="truncate text-sm font-medium text-gray-900">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="truncate text-xs text-gray-500">
                          {item.subtitle}
                        </div>
                      )}
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
