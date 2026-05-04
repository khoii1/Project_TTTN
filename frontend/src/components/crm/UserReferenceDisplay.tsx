"use client";

import { ReactNode, useEffect, useState } from "react";
import { usersApi } from "@/features/users/users.api";
import { User } from "@/features/auth/auth.types";

type UserReferenceDisplayProps = {
  userId?: string;
  fallback?: ReactNode;
};

const userLabelCache = new Map<string, Promise<string>>();

const getUserLabel = (user: User) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Unknown User";
};

const loadUserLabel = (userId: string) => {
  const cached = userLabelCache.get(userId);
  if (cached) return cached;

  const promise = usersApi.getById(userId).then(getUserLabel);
  userLabelCache.set(userId, promise);
  return promise;
};

export function UserReferenceDisplay({
  userId,
  fallback = "-",
}: UserReferenceDisplayProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
    });

    loadUserLabel(userId)
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
  }, [userId]);

  if (!userId) return <>{fallback}</>;
  if (loading) return <>Loading...</>;
  if (error || !label) return <>Unknown User</>;

  return <>{label}</>;
}
