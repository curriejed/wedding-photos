export type Identity = { id: string; name: string };

export type Photo = {
  id: string;
  user_id: string;
  user_name: string;
  storage_path: string;
  public_url: string;
  created_at: string;
};

export type PhotoWithStats = Photo & { like_count: number };

export type RankRow = {
  id: string;
  name: string;
  photo_count?: number;
  like_count?: number;
};
