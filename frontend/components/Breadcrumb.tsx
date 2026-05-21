"use client";

import { ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "mb-6" }: BreadcrumbProps) {
  const router = useRouter();

  return (
    <nav className={`flex items-center gap-1 text-sm font-medium flex-wrap ${className}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i === 0 && <Home className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />}
            {item.href && !isLast ? (
              <button
                type="button"
                onClick={() => router.push(item.href!)}
                className="text-ufv-azul hover:text-ufv-azul-oscuro dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? "text-gray-700 dark:text-slate-300 font-bold" : "text-gray-400 dark:text-slate-500"}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
