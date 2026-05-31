"use client";
import { useEffect, useState } from "react";
import type { Entity } from "@/lib/dynatrace";
import { Server, Database, Globe, Box } from "lucide-react";

const TYPE_ICON: Record<string, typeof Server> = {
  SERVICE: Server,
  DATABASE: Database,
  HTTP_CHECK: Globe,
};

type Props = { entityType?: string };

export default function ServiceList({ entityType = "SERVICE" }: Props) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dynatrace/entities?type=${encodeURIComponent(entityType)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setEntities(json.entities ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [entityType]);

  const Icon = TYPE_ICON[entityType] ?? Box;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1e293b]">
      <div className="border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-medium text-slate-300">
          {entityType.charAt(0) + entityType.slice(1).toLowerCase()}s
          {!loading && !error && (
            <span className="ml-2 text-xs text-slate-500">({entities.length})</span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-[#0f172a]" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-slate-500">{error}</div>
      ) : entities.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">No {entityType.toLowerCase()}s found</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {entities.slice(0, 50).map((e) => (
            <li key={e.entityId} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]">
              <Icon className="h-4 w-4 flex-shrink-0 text-[#6366f1]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{e.displayName}</p>
                <p className="truncate font-mono text-[10px] text-slate-600">{e.entityId}</p>
              </div>
            </li>
          ))}
          {entities.length > 50 && (
            <li className="px-5 py-2 text-xs text-slate-500">
              +{entities.length - 50} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
