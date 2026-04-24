export interface VideoResponse {
  id: string;
  title: string;
  description?: string;
  filePath: string;
  userId: string;
  createdAt: Date;
}
