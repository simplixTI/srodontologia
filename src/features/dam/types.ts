export type FileTag = {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type FileCollection = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type DamFileSummary = {
  file_id: string;
  organization_id: string;
  case_id: string | null;
  tag_names: string[] | null;
  is_favorite: boolean;
  collection_count: number;
};

export type FileWithMeta = {
  id: string;
  organization_id: string;
  case_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  case_number: string | null;
  case_title: string | null;
  tags: string[];
  is_favorite: boolean;
  collection_count: number;
};
