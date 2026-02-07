--
-- PostgreSQL database dump
--

\restrict fDr2wpcsy2T3UAbpg1qsfZfRKDCn4L6oOrGgYm5e8fxnM75IlRnTWh9rvaQaPuV

-- Dumped from database version 17.7
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_items; Type: TABLE; Schema: public; Owner: avnadmin
--

CREATE TABLE public.booking_items (
    id integer NOT NULL,
    booking_id integer,
    product_id integer,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.booking_items OWNER TO avnadmin;

--
-- Name: booking_items_id_seq; Type: SEQUENCE; Schema: public; Owner: avnadmin
--

CREATE SEQUENCE public.booking_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_items_id_seq OWNER TO avnadmin;

--
-- Name: booking_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avnadmin
--

ALTER SEQUENCE public.booking_items_id_seq OWNED BY public.booking_items.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: avnadmin
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    user_id integer,
    guest_first_name character varying(100) NOT NULL,
    guest_last_name character varying(100) NOT NULL,
    guest_email character varying(255) NOT NULL,
    guest_phone character varying(20) NOT NULL,
    booking_date date NOT NULL,
    booking_time time without time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying,
    total_amount numeric(10,2) NOT NULL,
    qr_code_hash character varying(255),
    special_requests text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'partial'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'checked_in'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.bookings OWNER TO avnadmin;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: avnadmin
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO avnadmin;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avnadmin
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: avnadmin
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO avnadmin;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: avnadmin
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO avnadmin;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avnadmin
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: avnadmin
--

CREATE TABLE public.products (
    id integer NOT NULL,
    category_id integer,
    name character varying(100) NOT NULL,
    description text,
    capacity integer DEFAULT 0,
    price numeric(10,2) NOT NULL,
    pricing_unit character varying(20) DEFAULT 'fixed'::character varying,
    time_slot character varying(20) DEFAULT 'any'::character varying,
    inventory_count integer DEFAULT 1,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_pricing_unit_check CHECK (((pricing_unit)::text = ANY ((ARRAY['fixed'::character varying, 'per_head'::character varying, 'per_hour'::character varying, 'per_night'::character varying])::text[]))),
    CONSTRAINT products_time_slot_check CHECK (((time_slot)::text = ANY ((ARRAY['day'::character varying, 'night'::character varying, 'any'::character varying])::text[])))
);


ALTER TABLE public.products OWNER TO avnadmin;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: avnadmin
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO avnadmin;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avnadmin
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: avnadmin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(20) DEFAULT 'guest'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'guest'::character varying, 'root'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO avnadmin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: avnadmin
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO avnadmin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avnadmin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: booking_items id; Type: DEFAULT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.booking_items ALTER COLUMN id SET DEFAULT nextval('public.booking_items_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: booking_items; Type: TABLE DATA; Schema: public; Owner: avnadmin
--

COPY public.booking_items (id, booking_id, product_id, quantity, unit_price, subtotal, start_time, end_time, created_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: avnadmin
--

COPY public.bookings (id, user_id, guest_first_name, guest_last_name, guest_email, guest_phone, booking_date, booking_time, status, payment_status, total_amount, qr_code_hash, special_requests, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: avnadmin
--

COPY public.categories (id, name, description, created_at) FROM stdin;
1	Entrance Fee	Day and Night tour access fees	2025-11-27 04:55:12.494934
2	Accommodation	Rooms, Cottages, and Villas	2025-11-27 04:55:12.494934
3	Amenities	Activities and Tours	2025-11-27 04:55:12.494934
4	Rentals	Equipment and Add-ons	2025-11-27 04:55:12.494934
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: avnadmin
--

COPY public.products (id, category_id, name, description, capacity, price, pricing_unit, time_slot, inventory_count, image_url, is_active, created_at, updated_at) FROM stdin;
1	1	Adult Entrance (Day)	\N	1	60.00	per_head	day	1000	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
2	1	Kid Entrance (Day)	\N	1	30.00	per_head	day	1000	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
3	1	Adult Entrance (Night)	\N	1	70.00	per_head	night	1000	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
4	1	Kid Entrance (Night)	\N	1	35.00	per_head	night	1000	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
5	2	Poolside Table	\N	4	300.00	fixed	day	10	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
6	2	Screen Cottage (Small)	\N	15	400.00	fixed	day	5	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
7	2	Screen Cottage (Large)	\N	20	700.00	fixed	day	5	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
8	2	Open Kubo	\N	10	300.00	fixed	day	8	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
9	2	Mating Cottage	\N	6	700.00	fixed	day	3	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
10	2	Function Hall	\N	30	3000.00	fixed	day	1	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
11	2	Duplex Room (Fan)	\N	2	1100.00	per_night	night	4	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
12	2	Duplex Room (AC)	\N	2	1300.00	per_night	night	4	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
13	2	Blue Room (AC)	\N	2	1350.00	per_night	night	2	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
14	2	Native Style Cottage	\N	2	950.00	per_night	night	3	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
15	2	Orange Terrace	\N	15	4200.00	per_night	night	1	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
16	2	Mini Rest House	\N	10	3000.00	per_night	night	1	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
17	2	Dorm Style Cottage (Small)	\N	10	1200.00	per_night	night	2	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
18	2	Dorm Style Cottage (Large)	\N	25	5000.00	per_night	night	1	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
19	4	Shorts	\N	0	50.00	fixed	any	50	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
20	4	Cooking Utensils	\N	0	100.00	fixed	any	20	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
21	4	Extra Bed	\N	0	250.00	fixed	any	10	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
22	4	Basketball/Volleyball	\N	0	50.00	per_hour	any	5	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
23	3	Horseback Ride	\N	1	50.00	fixed	day	10	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
24	3	Cave Tour	\N	1	50.00	per_head	day	100	\N	t	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: avnadmin
--

COPY public.users (id, email, password, first_name, last_name, phone, role, created_at, updated_at) FROM stdin;
1	admin@alfarm.com	$2a$10$rF9Qn4fJPVjJZ.xJZKVpUeN8qPX5h3x5J7ZGqX5X5X5X5X5X5X5Xu	Admin	User	\N	root	2025-11-27 04:55:12.494934	2025-11-27 04:55:12.494934
\.


--
-- Name: booking_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avnadmin
--

SELECT pg_catalog.setval('public.booking_items_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avnadmin
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avnadmin
--

SELECT pg_catalog.setval('public.categories_id_seq', 33, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avnadmin
--

SELECT pg_catalog.setval('public.products_id_seq', 33, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avnadmin
--

SELECT pg_catalog.setval('public.users_id_seq', 33, true);


--
-- Name: booking_items booking_items_pkey; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_bookings_date; Type: INDEX; Schema: public; Owner: avnadmin
--

CREATE INDEX idx_bookings_date ON public.bookings USING btree (booking_date);


--
-- Name: idx_bookings_email; Type: INDEX; Schema: public; Owner: avnadmin
--

CREATE INDEX idx_bookings_email ON public.bookings USING btree (guest_email);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: avnadmin
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: booking_items booking_items_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_items booking_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: avnadmin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fDr2wpcsy2T3UAbpg1qsfZfRKDCn4L6oOrGgYm5e8fxnM75IlRnTWh9rvaQaPuV

