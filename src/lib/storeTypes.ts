// E-commerce types
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  images: Array<{ url: string; alt?: string }>;
  videos: Array<{ url: string; thumbnail?: string }>;
  category_id?: string;
  category?: ProductCategory;
  base_price: number;
  compare_price?: number;
  cost_price?: number;
  currency: 'PEN' | 'USD';
  status: 'draft' | 'active' | 'archived';
  weight?: number;
  sku?: string;
  track_stock: boolean;
  allow_backorder: boolean;
  general_stock: number;
  tags: string[];
  specs?: Record<string, string>;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  featured: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  avg_rating?: number;
  review_count?: number;
  is_digital?: boolean;
  digital_file_url?: string;
  digital_demo_url?: string;
  digital_instructions?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price?: number;
  compare_price?: number;
  stock: number;
  attributes: Record<string, string>;
  images: Array<{ url: string; alt?: string }>;
  status: 'active' | 'inactive';
  sort_order: number;
  weight?: number;
  attribute_type?: 'text' | 'color' | 'image';
  color_name?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  exchange_rate: number;
  shipping_address: ShippingAddress;
  billing_address: ShippingAddress;
  coupon_id?: string;
  coupon_code?: string;
  shipping_method_name?: string;
  notes?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  tracking?: OrderTracking[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total: number;
  image_url?: string;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  description?: string;
  location?: string;
  created_at: string;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  region: string;
  country: string;
  zip_code?: string;
  ruc?: string;
  razon_social?: string;
  invoice_type?: 'boleta' | 'factura';
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions: string[];
  status: 'active' | 'inactive';
  methods?: ShippingMethod[];
}

export interface ShippingMethod {
  id: string;
  zone_id: string;
  name: string;
  description?: string;
  type: 'flat' | 'weight' | 'free_threshold';
  price: number;
  free_threshold?: number;
  estimated_days_min?: number;
  estimated_days_max?: number;
  status: 'active' | 'inactive';
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  status: 'active' | 'inactive';
  applies_to: 'all' | 'categories' | 'products';
  category_ids?: string[];
  product_ids?: string[];
}

export interface MlmCommissionConfig {
  id: string;
  rank: string;
  level: number;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase_amount: number;
  status: 'active' | 'inactive';
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  body?: string;
  images: string[];
  verified_purchase: boolean;
  helpful_count?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile?: { full_name: string; avatar_url?: string };
  product?: { name: string; images: Array<{ url: string }> };
}
