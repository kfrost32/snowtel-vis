"use client";

import { useState, useMemo, ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { theme } from "@/lib/theme";

type SortDir = "asc" | "desc";

interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  className?: string;
  defaultSortDir?: SortDir;
  getValue: (item: T) => string | number;
  render: (item: T, index?: number) => ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getHref: (item: T) => string;
  getKey: (item: T) => string;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
}

export default function SortableTable<T>({
  data,
  columns,
  getHref,
  getKey,
  defaultSortKey,
  defaultSortDir = "asc",
}: SortableTableProps<T>) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState(defaultSortKey || columns[0]?.key || "");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      const col = columns.find(c => c.key === key);
      setSortDir(col?.defaultSortDir || "desc");
    }
  }

  const sorted = useMemo(() => {
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = col.getValue(a);
      const bVal = col.getValue(b);

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortDir, columns]);

  return (
    <div className="overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: "touch" }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: theme.borderGray }}>
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={`py-3 text-xs font-medium tracking-wider font-mono cursor-pointer select-none hover:opacity-70 ${col.align === "right" ? "text-right" : "text-left"} ${col.className || ""}`}
                  style={{ color: isActive ? theme.black : theme.gray }}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                    {col.label}
                    {isActive
                      ? (sortDir === "asc"
                        ? <ChevronUp size={12} style={{ color: theme.black }} />
                        : <ChevronDown size={12} style={{ color: theme.black }} />)
                      : <ChevronDown size={12} style={{ color: theme.borderGray }} />
                    }
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, index) => (
            <tr
              key={getKey(item)}
              className="border-b group hover:bg-black/[0.02] transition-colors duration-150 cursor-pointer"
              style={{ borderColor: theme.borderGray }}
              onClick={() => router.push(getHref(item))}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className || ""}>
                  {col.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { Column, SortDir };
