export type TokenPair = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
};

export type User = {
  id: string;
  phone: string;
  name: string | null;
  active: boolean;
  contacts_synced_at: string | null;
  created_at: string;
};

export type LoginResult = { tokens: TokenPair; user: User };

export type Hub = { id: string; name: string; address: string; latitude: number; longitude: number };

export type Car = {
  id: string;
  hub_id: string;
  hub_name: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  price_per_day: number;
  photos: string[];
};

export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  car_id: string;
  hub_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  price_per_day: number;
  total_price: number;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  car_brand: string;
  car_model: string;
  car_plate: string;
  hub_name: string;
  hub_address: string;
  hub_latitude: number;
  hub_longitude: number;
};

export type Page<T> = { data: T[]; total: number; limit: number; offset: number };

export type ContactsStatus = { synced: boolean; synced_at: string | null; count: number; can_delete: boolean };
