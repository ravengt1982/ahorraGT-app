export interface Product {
  id: string;
  name: string;
  name_lower?: string;
  normalized_name?: string;
  category_id: number | null;
  price?: number;
  min_price?: number | null;
  store_id?: string;
  store_name?: string;
  image_url?: string | null;
  base_product_type?: string;
  net_quantity?: number | null;
  net_unit?: string | null;
  unit_price?: number | null;
  unit_price_standard?: string | null;
  currency?: string;
  created_at?: string;
  store_count?: number;
  cheapest_store?: string | null;
  prices?: { price: number; stores: { name: string } | null }[];
}

export interface Store {
  id: string;
  name: string;
  url: string | null;
  created_at?: string;
}

export interface Price {
  id: string;
  product_id: string;
  store_id: string;
  store_name?: string;
  price: number;
  currency?: string;
  net_quantity?: number | null;
  net_unit?: string | null;
  unit_price?: number | null;
  unit_price_standard?: number | null;
  created_at?: string;
  stores?: Pick<Store, 'id' | 'name'>;
}

export interface Category {
  id: number;
  name: string;
  created_at?: string;
}

export interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  saved_at: string;
}
