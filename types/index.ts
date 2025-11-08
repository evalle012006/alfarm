export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'guest' | 'root';
  createdAt: Date;
}

export interface Room {
  id: number;
  roomNumber: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'villa' | 'cabin';
  description?: string;
  capacity: number;
  pricePerNight: number;
  status: 'available' | 'occupied' | 'maintenance';
  imageUrl?: string;
  amenities?: Amenity[];
}

export interface Amenity {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface Booking {
  id: number;
  userId: number;
  roomId: number;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
  numberOfGuests: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  specialRequests?: string;
  createdAt: Date;
  user?: User;
  room?: Room;
}
