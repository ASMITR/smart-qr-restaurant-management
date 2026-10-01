import { Timestamp } from "firebase/firestore";

export type UserRole = "OWNER" | "MANAGER" | "KITCHEN";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "PAYMENT_PENDING" | "CLEANING";
export type OrderStatus = "PLACED" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  googleReviewUrl?: string;
  location: {
    latitude: number;
    longitude: number;
    allowedRadiusMeters: number;
  };
  settings?: {
    taxPercent: number;
    serviceChargePercent: number;
    currency: string;
    isOpen: boolean;
  };
  createdAt: Timestamp;
}

export interface RestaurantUser {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  qrToken: string;
  status: TableStatus;
  activeSessionId?: string | null;
  capacity?: number;
  createdAt: Timestamp;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg?: boolean;
  isAvailable: boolean;
  preparationTimeMinutes?: number;
  sortOrder: number;
}

export interface CustomerSession {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  customerName: string;
  customerPhone?: string;
  locationVerified: boolean;
  locationVerifiedAt?: Timestamp;
  distanceFromRestaurantMeters?: number;
  locationAccuracyMeters?: number;
  status: SessionStatus;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  priceAtOrderTime: number;
  notes?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  sessionId: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  notes?: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  preparingAt?: Timestamp;
  readyAt?: Timestamp;
  servedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

export interface Payment {
  id: string;
  restaurantId: string;
  tableId: string;
  sessionId: string;
  orderIds: string[];
  customerName: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  method: PaymentMethod;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Timestamp;
  paidAt?: Timestamp;
}

export interface StaffRequest {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  sessionId: string;
  customerName: string;
  type: "CALL_STAFF" | "REQUEST_BILL" | "ADD_FOOD";
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  restaurantId: string;
  userId: string;
  userRole: UserRole;
  action: string;
  relevantId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Timestamp;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface LocationResult {
  verified: boolean;
  distanceMeters: number;
  accuracyMeters: number;
  reason?: string;
}
