--
-- PostgreSQL database dump
--

\restrict 6QJIvKwDiBqPyo9DXirQLmt8kcUEfVBKsgVhcs6EycB3GgcdwacGqPBxUGb4EWe

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

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

--
-- Name: BillingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BillingStatus" AS ENUM (
    'PENDING',
    'PAID',
    'REFUNDED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: ClubStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClubStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DISSOLVED'
);


--
-- Name: CompetitionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompetitionType" AS ENUM (
    'LEAGUE',
    'CUP',
    'TOURNAMENT',
    'SUPER_CUP'
);


--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'SCHEDULED',
    'LIVE',
    'FINISHED',
    'CANCELLED',
    'POSTPONED'
);


--
-- Name: SeasonStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SeasonStatus" AS ENUM (
    'PLANNED',
    'ONGOING',
    'FINISHED'
);


--
-- Name: SubscriptionPlan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'FREE',
    'PRO',
    'ELITE'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'CANCELLED',
    'EXPIRED',
    'PENDING'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    "userId" text,
    changes jsonb,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: billings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billings (
    id text NOT NULL,
    "subscriptionId" text NOT NULL,
    "userId" text NOT NULL,
    "amountCents" integer NOT NULL,
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    status public."BillingStatus" DEFAULT 'PENDING'::public."BillingStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "externalId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clubs (
    id text NOT NULL,
    name text NOT NULL,
    "fullName" text,
    "shortName" text,
    city text,
    state text,
    country character varying(2),
    "foundedYear" integer,
    "primaryColor" character(7),
    website text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "importedAt" timestamp(3) without time zone,
    "importedFrom" text,
    qid text,
    search_vector tsvector,
    status public."ClubStatus" DEFAULT 'ACTIVE'::public."ClubStatus" NOT NULL,
    latitude double precision,
    longitude double precision,
    "sourceUrl" text
);


--
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    id text NOT NULL,
    name text NOT NULL,
    country character varying(2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "importedAt" timestamp(3) without time zone,
    "importedFrom" text,
    qid text,
    search_vector tsvector,
    type public."CompetitionType",
    "sourceUrl" text
);


--
-- Name: knowledge_graph; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_graph (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "sourceType" text NOT NULL,
    "targetId" text NOT NULL,
    "targetType" text NOT NULL,
    relation text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id text NOT NULL,
    "homeClubId" text NOT NULL,
    "awayClubId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "competitionId" text,
    "seasonId" text,
    "homeScore" integer,
    "awayScore" integer,
    round text,
    venue text,
    "stadiumId" text,
    status public."MatchStatus" DEFAULT 'SCHEDULED'::public."MatchStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id text NOT NULL,
    "fullName" text NOT NULL,
    "shortName" text,
    "birthDate" timestamp(3) without time zone,
    country character varying(2),
    "position" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clubId" text,
    "importedAt" timestamp(3) without time zone,
    "importedFrom" text,
    qid text,
    search_vector tsvector,
    "sourceUrl" text
);


--
-- Name: ranking_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_entries (
    id text NOT NULL,
    "rankingId" text NOT NULL,
    "clubId" text NOT NULL,
    "position" integer NOT NULL,
    points integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rankings (
    id text NOT NULL,
    name text NOT NULL,
    "competitionId" text,
    season text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    status public."SeasonStatus" DEFAULT 'PLANNED'::public."SeasonStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.sessions FORCE ROW LEVEL SECURITY;


--
-- Name: stadiums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stadiums (
    id text NOT NULL,
    name text NOT NULL,
    city text,
    state text,
    country character varying(2),
    latitude double precision,
    longitude double precision,
    capacity integer,
    surface text,
    qid text,
    "clubId" text,
    "importedFrom" text,
    "importedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sourceUrl" text
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    "userId" text NOT NULL,
    plan public."SubscriptionPlan" DEFAULT 'FREE'::public."SubscriptionPlan" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'PENDING'::public."SubscriptionStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "currentPeriodEnd" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    trial_used_at timestamp(3) without time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "passwordHash" text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: billings billings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_graph knowledge_graph_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph
    ADD CONSTRAINT knowledge_graph_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: ranking_entries ranking_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT ranking_entries_pkey PRIMARY KEY (id);


--
-- Name: rankings rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rankings
    ADD CONSTRAINT rankings_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY ("roleId", "permissionId");


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: stadiums stadiums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stadiums
    ADD CONSTRAINT stadiums_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY ("userId", "roleId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: billings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX billings_status_idx ON public.billings USING btree (status);


--
-- Name: billings_subscriptionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "billings_subscriptionId_idx" ON public.billings USING btree ("subscriptionId");


--
-- Name: billings_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "billings_userId_idx" ON public.billings USING btree ("userId");


--
-- Name: billings_userId_status_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "billings_userId_status_paidAt_idx" ON public.billings USING btree ("userId", status, "paidAt");


--
-- Name: clubs_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_city_idx ON public.clubs USING btree (city);


--
-- Name: clubs_city_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_city_state_idx ON public.clubs USING btree (city, state);


--
-- Name: clubs_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_country_idx ON public.clubs USING btree (country);


--
-- Name: clubs_country_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_country_status_idx ON public.clubs USING btree (country, status);


--
-- Name: clubs_name_country_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clubs_name_country_key ON public.clubs USING btree (name, country);


--
-- Name: clubs_qid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_qid_idx ON public.clubs USING btree (qid);


--
-- Name: clubs_qid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clubs_qid_key ON public.clubs USING btree (qid);


--
-- Name: clubs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clubs_status_idx ON public.clubs USING btree (status);


--
-- Name: competitions_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX competitions_country_idx ON public.competitions USING btree (country);


--
-- Name: competitions_qid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX competitions_qid_idx ON public.competitions USING btree (qid);


--
-- Name: competitions_qid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX competitions_qid_key ON public.competitions USING btree (qid);


--
-- Name: competitions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX competitions_type_idx ON public.competitions USING btree (type);


--
-- Name: knowledge_graph_relation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX knowledge_graph_relation_idx ON public.knowledge_graph USING btree (relation);


--
-- Name: knowledge_graph_sourceId_sourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "knowledge_graph_sourceId_sourceType_idx" ON public.knowledge_graph USING btree ("sourceId", "sourceType");


--
-- Name: knowledge_graph_sourceType_relation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "knowledge_graph_sourceType_relation_idx" ON public.knowledge_graph USING btree ("sourceType", relation);


--
-- Name: knowledge_graph_targetId_targetType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "knowledge_graph_targetId_targetType_idx" ON public.knowledge_graph USING btree ("targetId", "targetType");


--
-- Name: matches_awayClubId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_awayClubId_idx" ON public.matches USING btree ("awayClubId");


--
-- Name: matches_competitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_competitionId_idx" ON public.matches USING btree ("competitionId");


--
-- Name: matches_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_date_idx ON public.matches USING btree (date);


--
-- Name: matches_homeClubId_awayClubId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_homeClubId_awayClubId_date_idx" ON public.matches USING btree ("homeClubId", "awayClubId", date);


--
-- Name: matches_homeClubId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_homeClubId_idx" ON public.matches USING btree ("homeClubId");


--
-- Name: matches_seasonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_seasonId_idx" ON public.matches USING btree ("seasonId");


--
-- Name: matches_stadiumId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "matches_stadiumId_idx" ON public.matches USING btree ("stadiumId");


--
-- Name: matches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_status_idx ON public.matches USING btree (status);


--
-- Name: permissions_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name);


--
-- Name: players_birthDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "players_birthDate_idx" ON public.players USING btree ("birthDate");


--
-- Name: players_clubId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "players_clubId_idx" ON public.players USING btree ("clubId");


--
-- Name: players_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX players_country_idx ON public.players USING btree (country);


--
-- Name: players_fullName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "players_fullName_idx" ON public.players USING btree ("fullName");


--
-- Name: players_qid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX players_qid_idx ON public.players USING btree (qid);


--
-- Name: players_qid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX players_qid_key ON public.players USING btree (qid);


--
-- Name: ranking_entries_clubId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ranking_entries_clubId_idx" ON public.ranking_entries USING btree ("clubId");


--
-- Name: ranking_entries_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_entries_position_idx ON public.ranking_entries USING btree ("position");


--
-- Name: ranking_entries_rankingId_clubId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ranking_entries_rankingId_clubId_key" ON public.ranking_entries USING btree ("rankingId", "clubId");


--
-- Name: ranking_entries_rankingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ranking_entries_rankingId_idx" ON public.ranking_entries USING btree ("rankingId");


--
-- Name: ranking_entries_rankingId_position_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ranking_entries_rankingId_position_key" ON public.ranking_entries USING btree ("rankingId", "position");


--
-- Name: rankings_competitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "rankings_competitionId_idx" ON public.rankings USING btree ("competitionId");


--
-- Name: rankings_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rankings_season_idx ON public.rankings USING btree (season);


--
-- Name: role_permissions_permissionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "role_permissions_permissionId_idx" ON public.role_permissions USING btree ("permissionId");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: seasons_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seasons_startDate_idx" ON public.seasons USING btree ("startDate");


--
-- Name: seasons_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seasons_status_idx ON public.seasons USING btree (status);


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_revokedAt_idx" ON public.sessions USING btree ("revokedAt");


--
-- Name: sessions_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sessions_tokenHash_key" ON public.sessions USING btree ("tokenHash");


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: sessions_userId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_userId_revokedAt_idx" ON public.sessions USING btree ("userId", "revokedAt");


--
-- Name: stadiums_clubId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stadiums_clubId_idx" ON public.stadiums USING btree ("clubId");


--
-- Name: stadiums_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stadiums_country_idx ON public.stadiums USING btree (country);


--
-- Name: stadiums_qid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stadiums_qid_idx ON public.stadiums USING btree (qid);


--
-- Name: stadiums_qid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stadiums_qid_key ON public.stadiums USING btree (qid);


--
-- Name: subscriptions_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_plan_idx ON public.subscriptions USING btree (plan);


--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);


--
-- Name: subscriptions_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "subscriptions_userId_key" ON public.subscriptions USING btree ("userId");


--
-- Name: user_roles_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_roles_roleId_idx" ON public.user_roles USING btree ("roleId");


--
-- Name: users_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_createdAt_idx" ON public.users USING btree ("createdAt");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_email_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_status_idx ON public.users USING btree (email, status);


--
-- Name: users_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_status_idx ON public.users USING btree (status);


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: billings billings_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT "billings_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public.subscriptions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: billings billings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT "billings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: clubs clubs_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT "clubs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_awayClubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: matches matches_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public.competitions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_homeClubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: matches matches_seasonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_stadiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES public.stadiums(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: players players_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT "players_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ranking_entries ranking_entries_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT "ranking_entries_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ranking_entries ranking_entries_rankingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT "ranking_entries_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES public.rankings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rankings rankings_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rankings
    ADD CONSTRAINT "rankings_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public.competitions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stadiums stadiums_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stadiums
    ADD CONSTRAINT "stadiums_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions sessions_delete_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_delete_service ON public.sessions FOR DELETE USING ((current_setting('app.current_user_role'::text, true) = 'SERVICE'::text));


--
-- Name: sessions sessions_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_insert_owner ON public.sessions FOR INSERT WITH CHECK ((("userId" = current_setting('app.current_user_id'::text, true)) OR (current_setting('app.current_user_role'::text, true) = 'SERVICE'::text)));


--
-- Name: sessions sessions_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_owner_select ON public.sessions FOR SELECT USING (("userId" = current_setting('app.current_user_id'::text, true)));


--
-- Name: sessions sessions_select_by_token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_select_by_token ON public.sessions FOR SELECT USING (("tokenHash" = NULLIF(current_setting('app.current_token_hash'::text, true), ''::text)));


--
-- Name: sessions sessions_service_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_service_select ON public.sessions FOR SELECT USING ((current_setting('app.current_user_role'::text, true) = 'SERVICE'::text));


--
-- Name: sessions sessions_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_update_owner ON public.sessions FOR UPDATE USING (("userId" = current_setting('app.current_user_id'::text, true))) WITH CHECK (("userId" = current_setting('app.current_user_id'::text, true)));


--
-- Name: sessions sessions_update_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_update_service ON public.sessions FOR UPDATE USING ((current_setting('app.current_user_role'::text, true) = 'SERVICE'::text)) WITH CHECK ((current_setting('app.current_user_role'::text, true) = 'SERVICE'::text));


--
-- PostgreSQL database dump complete
--

\unrestrict 6QJIvKwDiBqPyo9DXirQLmt8kcUEfVBKsgVhcs6EycB3GgcdwacGqPBxUGb4EWe

