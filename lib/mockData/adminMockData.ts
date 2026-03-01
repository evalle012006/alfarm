// Mock data for admin dashboard

export interface MockBooking {
    id: string;
    customerName: string;
    email: string;
    checkIn: string;
    checkOut: string;
    product: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    totalAmount: number;
    guests: number;
}

export interface MockProduct {
    id: number;
    name: string;
    category_id: number;
    category_name: string;
    description: string;
    capacity: number;
    price: number;
    pricing_unit: 'fixed' | 'per_head' | 'per_hour' | 'per_night';
    time_slot: 'day' | 'night' | 'any';
    inventory_count: number;
    image_url: string | null;
    is_active: boolean;
}

export const mockBookings: MockBooking[] = [
    {
        id: 'BK-2025-001',
        customerName: 'Juan Dela Cruz',
        email: 'juan@example.com',
        checkIn: '2025-01-15',
        checkOut: '2025-01-17',
        product: 'Deluxe Suite',
        status: 'confirmed',
        totalAmount: 8000,
        guests: 4
    },
    {
        id: 'BK-2025-002',
        customerName: 'Maria Santos',
        email: 'maria@example.com',
        checkIn: '2025-01-20',
        checkOut: '2025-01-20',
        product: 'Open Kubo',
        status: 'pending',
        totalAmount: 3500,
        guests: 6
    },
    {
        id: 'BK-2025-003',
        customerName: 'Pedro Reyes',
        email: 'pedro@example.com',
        checkIn: '2025-01-10',
        checkOut: '2025-01-12',
        product: 'Standard Room',
        status: 'completed',
        totalAmount: 3000,
        guests: 2
    },
    {
        id: 'BK-2025-004',
        customerName: 'Ana Garcia',
        email: 'ana@example.com',
        checkIn: '2025-01-25',
        checkOut: '2025-01-27',
        product: 'Private Villa',
        status: 'confirmed',
        totalAmount: 13000,
        guests: 8
    },
    {
        id: 'BK-2025-005',
        customerName: 'Carlos Mendoza',
        email: 'carlos@example.com',
        checkIn: '2025-01-18',
        checkOut: '2025-01-18',
        product: 'Pavilion Rental',
        status: 'cancelled',
        totalAmount: 2500,
        guests: 10
    },
    {
        id: 'BK-2025-006',
        customerName: 'Sofia Torres',
        email: 'sofia@example.com',
        checkIn: '2025-02-01',
        checkOut: '2025-02-03',
        product: 'Deluxe Suite',
        status: 'pending',
        totalAmount: 8000,
        guests: 3
    },
    {
        id: 'BK-2025-007',
        customerName: 'Miguel Ramos',
        email: 'miguel@example.com',
        checkIn: '2025-01-12',
        checkOut: '2025-01-14',
        product: 'Standard Room',
        status: 'completed',
        totalAmount: 3000,
        guests: 2
    },
    {
        id: 'BK-2025-008',
        customerName: 'Isabel Cruz',
        email: 'isabel@example.com',
        checkIn: '2025-01-28',
        checkOut: '2025-01-30',
        product: 'Private Villa',
        status: 'confirmed',
        totalAmount: 13000,
        guests: 6
    },
    {
        id: 'BK-2025-009',
        customerName: 'Roberto Flores',
        email: 'roberto@example.com',
        checkIn: '2025-01-22',
        checkOut: '2025-01-22',
        product: 'Open Kubo',
        status: 'pending',
        totalAmount: 3500,
        guests: 8
    },
    {
        id: 'BK-2025-010',
        customerName: 'Elena Morales',
        email: 'elena@example.com',
        checkIn: '2025-02-05',
        checkOut: '2025-02-07',
        product: 'Deluxe Suite',
        status: 'confirmed',
        totalAmount: 8000,
        guests: 4
    }
];

export const mockProducts: MockProduct[] = [
    {
        id: 1,
        name: 'Adult Entrance (Day)',
        category_id: 1,
        category_name: 'Entrance Fee',
        description: 'Day tour access for adults',
        capacity: 1,
        price: 60,
        pricing_unit: 'per_head',
        time_slot: 'day',
        inventory_count: 1000,
        image_url: null,
        is_active: true
    },
    {
        id: 2,
        name: 'Kid Entrance (Day)',
        category_id: 1,
        category_name: 'Entrance Fee',
        description: 'Day tour access for kids',
        capacity: 1,
        price: 30,
        pricing_unit: 'per_head',
        time_slot: 'day',
        inventory_count: 1000,
        image_url: null,
        is_active: true
    },
    {
        id: 3,
        name: 'Poolside Table',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Table by the pool for day use',
        capacity: 4,
        price: 300,
        pricing_unit: 'fixed',
        time_slot: 'day',
        inventory_count: 10,
        image_url: null,
        is_active: true
    },
    {
        id: 4,
        name: 'Screen Cottage (Small)',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Small screened cottage for day use',
        capacity: 15,
        price: 400,
        pricing_unit: 'fixed',
        time_slot: 'day',
        inventory_count: 5,
        image_url: null,
        is_active: true
    },
    {
        id: 5,
        name: 'Open Kubo',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Traditional Filipino cottage for day use',
        capacity: 10,
        price: 300,
        pricing_unit: 'fixed',
        time_slot: 'day',
        inventory_count: 8,
        image_url: null,
        is_active: true
    },
    {
        id: 6,
        name: 'Duplex Room (Fan)',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Overnight room with fan',
        capacity: 2,
        price: 1100,
        pricing_unit: 'per_night',
        time_slot: 'night',
        inventory_count: 4,
        image_url: null,
        is_active: true
    },
    {
        id: 7,
        name: 'Duplex Room (AC)',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Overnight room with air conditioning',
        capacity: 2,
        price: 1300,
        pricing_unit: 'per_night',
        time_slot: 'night',
        inventory_count: 4,
        image_url: null,
        is_active: true
    },
    {
        id: 8,
        name: 'Orange Terrace',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Large terrace for groups',
        capacity: 15,
        price: 4200,
        pricing_unit: 'per_night',
        time_slot: 'night',
        inventory_count: 1,
        image_url: null,
        is_active: true
    },
    {
        id: 9,
        name: 'Shorts',
        category_id: 4,
        category_name: 'Rentals',
        description: 'Swimming shorts rental',
        capacity: 0,
        price: 50,
        pricing_unit: 'fixed',
        time_slot: 'any',
        inventory_count: 50,
        image_url: null,
        is_active: true
    },
    {
        id: 10,
        name: 'Horseback Ride',
        category_id: 3,
        category_name: 'Amenities',
        description: 'Horseback riding experience',
        capacity: 1,
        price: 50,
        pricing_unit: 'fixed',
        time_slot: 'day',
        inventory_count: 10,
        image_url: null,
        is_active: true
    },
    {
        id: 11,
        name: 'Cave Tour',
        category_id: 3,
        category_name: 'Amenities',
        description: 'Guided cave exploration tour',
        capacity: 1,
        price: 50,
        pricing_unit: 'per_head',
        time_slot: 'day',
        inventory_count: 100,
        image_url: null,
        is_active: true
    },
    {
        id: 12,
        name: 'Function Hall',
        category_id: 2,
        category_name: 'Accommodation',
        description: 'Large hall for events and gatherings',
        capacity: 30,
        price: 3000,
        pricing_unit: 'fixed',
        time_slot: 'day',
        inventory_count: 1,
        image_url: null,
        is_active: false
    }
];

export interface MockGuest {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    isShadow: boolean;
    totalBookings: number;
    lastBookingDate: string | null;
    totalSpent: number;
}

export const mockGuests: MockGuest[] = [
    {
        id: 1,
        email: 'juan@example.com',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        phone: '09171234567',
        role: 'guest',
        isActive: true,
        createdAt: '2024-12-01T08:00:00Z',
        isShadow: false,
        totalBookings: 5,
        lastBookingDate: '2025-01-15',
        totalSpent: 12500
    },
    {
        id: 2,
        email: 'maria@example.com',
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '09187654321',
        role: 'guest',
        isActive: true,
        createdAt: '2024-11-20T10:30:00Z',
        isShadow: false,
        totalBookings: 2,
        lastBookingDate: '2025-01-20',
        totalSpent: 4200
    },
    {
        id: 3,
        email: 'pedro@example.com',
        firstName: 'Pedro',
        lastName: 'Reyes',
        phone: '09191112222',
        role: 'guest',
        isActive: true,
        createdAt: '2025-01-05T14:15:00Z',
        isShadow: true,
        totalBookings: 1,
        lastBookingDate: '2025-01-10',
        totalSpent: 3000
    },
    {
        id: 4,
        email: 'shadow_guest@example.com',
        firstName: 'Shadow',
        lastName: 'Account',
        phone: '09000000000',
        role: 'guest',
        isActive: true,
        createdAt: '2025-02-10T11:00:00Z',
        isShadow: true,
        totalBookings: 1,
        lastBookingDate: '2025-02-10',
        totalSpent: 1500
    },
    {
        id: 5,
        email: 'elena@example.com',
        firstName: 'Elena',
        lastName: 'Morales',
        phone: '09223334444',
        role: 'guest',
        isActive: true,
        createdAt: '2025-01-28T09:45:00Z',
        isShadow: false,
        totalBookings: 3,
        lastBookingDate: '2025-02-05',
        totalSpent: 8500
    }
];
