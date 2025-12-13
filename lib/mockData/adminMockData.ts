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
    id: string;
    name: string;
    type: 'room' | 'day-use' | 'add-on';
    description: string;
    capacity: string;
    pricePerNight: number;
    available: boolean;
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
        id: 'PROD-001',
        name: 'Standard Room',
        type: 'room',
        description: 'Comfortable and cozy room perfect for couples',
        capacity: '2 Adults',
        pricePerNight: 1500,
        available: true
    },
    {
        id: 'PROD-002',
        name: 'Deluxe Suite',
        type: 'room',
        description: 'Spacious suite with premium amenities',
        capacity: '4 Adults',
        pricePerNight: 4000,
        available: true
    },
    {
        id: 'PROD-003',
        name: 'Private Villa',
        type: 'room',
        description: 'Exclusive villa with full privacy',
        capacity: '8 Adults',
        pricePerNight: 6500,
        available: true
    },
    {
        id: 'PROD-004',
        name: 'Open Kubo',
        type: 'day-use',
        description: 'Traditional Filipino cottage for day use',
        capacity: '10 Persons',
        pricePerNight: 3500,
        available: true
    },
    {
        id: 'PROD-005',
        name: 'Pavilion Rental',
        type: 'day-use',
        description: 'Large pavilion for events and gatherings',
        capacity: '20 Persons',
        pricePerNight: 2500,
        available: true
    },
    {
        id: 'PROD-006',
        name: 'Picnic Table',
        type: 'day-use',
        description: 'Outdoor picnic table with shade',
        capacity: '6 Persons',
        pricePerNight: 500,
        available: true
    },
    {
        id: 'PROD-007',
        name: 'Bonfire Kit',
        type: 'add-on',
        description: 'Complete bonfire setup with firewood',
        capacity: 'N/A',
        pricePerNight: 800,
        available: true
    },
    {
        id: 'PROD-008',
        name: 'BBQ Grill Set',
        type: 'add-on',
        description: 'Grill with charcoal and utensils',
        capacity: 'N/A',
        pricePerNight: 600,
        available: true
    },
    {
        id: 'PROD-009',
        name: 'Karaoke System',
        type: 'add-on',
        description: 'Professional karaoke system rental',
        capacity: 'N/A',
        pricePerNight: 1200,
        available: false
    },
    {
        id: 'PROD-010',
        name: 'Family Room',
        type: 'room',
        description: 'Large room perfect for families',
        capacity: '6 Adults',
        pricePerNight: 3500,
        available: true
    }
];
