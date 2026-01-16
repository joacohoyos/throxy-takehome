'use client';

import { useRealtimeLeads } from '../hooks/use-realtime-leads';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeLeads();
  return <>{children}</>;
}
