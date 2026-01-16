import axios from 'axios';
import type { UploadResponse } from '@/types/api';

export async function uploadLeadsAPI(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post<UploadResponse>('/api/leads/upload', formData);
  return data;
}
