"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Lead } from "@/types/lead";
import type { LeadsResponse, ProgressResponse } from "@/types/api";

interface LeadsUpdatedEvent {
  leads: Lead[];
}

export function useRealtimeLeads() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel("leads-updates");

    channel
      .on("broadcast", { event: "leads-updated" }, (payload) => {
        console.log("Received leads-updated event:", payload);
        const data = payload.payload as LeadsUpdatedEvent;
        const { leads: updatedLeads } = data;

        queryClient.setQueriesData<
          LeadsResponse & { sort: { sortBy: string; sortOrder: string } }
        >({ queryKey: ["leads"] }, (oldData) => {
          if (!oldData) return oldData;

          const updatedLeadsMap = new Map(
            updatedLeads.map((lead) => [lead.id, lead]),
          );

          const existingIds = new Set(oldData.leads.map((l) => l.id));
          const newLeads = updatedLeads.filter((l) => !existingIds.has(l.id));

          const mergedLeads = oldData.leads.map(
            (l) => updatedLeadsMap.get(l.id) ?? l,
          );

          const sort = oldData.sort;
          return {
            ...oldData,
            leads: [...newLeads, ...mergedLeads].toSorted((a, b) => {
              const aValue = (a[sort.sortBy as keyof Lead] as any) ?? "";
              const bValue = (b[sort.sortBy as keyof Lead] as any) ?? "";

              if (isNaN(aValue) || isNaN(bValue)) {
                if (sort.sortOrder === "asc") {
                  return aValue.localeCompare(bValue);
                } else {
                  return bValue.localeCompare(aValue);
                }
              } else {
                if (sort.sortOrder === "asc") {
                  return (aValue as number) - (bValue as number);
                } else {
                  return (bValue as number) - (aValue as number);
                }
              }
            }),
            total: oldData.total + newLeads.length,
          };
        });

        queryClient.setQueryData<ProgressResponse>(["progress"], (oldData) => {
          if (!oldData) return oldData;

          const newData = { ...oldData };

          for (const lead of updatedLeads) {
            if (lead.status === "pending") {
              newData.total += 1;
              newData.pending += 1;
            } else if (lead.status === "completed") {
              newData.processing = Math.max(0, newData.processing - 1);
              newData.completed += 1;
            } else if (lead.status === "error") {
              newData.processing = Math.max(0, newData.processing - 1);
              newData.error += 1;
            }
          }

          return newData;
        });

        for (const lead of updatedLeads) {
          if (lead.status === "completed" && lead.score !== null) {
            const leadName = `${lead.lead_first_name} ${lead.lead_last_name}`;
            toast.success(`${leadName} scored ${lead.score}/10`);
          } else if (lead.status === "error") {
            const leadName = `${lead.lead_first_name} ${lead.lead_last_name}`;
            toast.error(`Failed to score ${leadName}`);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
