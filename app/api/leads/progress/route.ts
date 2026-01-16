import { NextResponse } from 'next/server';
import { SupabaseLeadRepository } from '@/server/infrastructure/repositories/supabase-lead.repository';
import { GetLeadProgressQuery } from '@/server/application/queries/get-lead-progress.query';
import type { ProgressResponse, ApiError } from '@/types/api';

export async function GET(): Promise<NextResponse<ProgressResponse | ApiError>> {
  try {
    const repository = new SupabaseLeadRepository();
    const query = new GetLeadProgressQuery(repository);
    const stats = await query.execute();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
