# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean-English bilingual messenger application built with React, Vite, and Supabase. Messages can be written in Korean and translated to English via Supabase Edge Functions.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint with zero warnings tolerance
npm run preview  # Preview production build locally
```

## Architecture

### Frontend Stack
- **React 18** with TypeScript (strict mode)
- **Vite** as build tool
- **Tailwind CSS** for styling (with Noto Sans KR font)
- **Lucide React** for icons

### Backend (Supabase)
- **Auth**: Email/password authentication via `useAuth` hook
- **Database**: PostgreSQL with two tables (`rooms`, `messages`)
- **Realtime**: Postgres changes subscription for live message updates
- **Edge Functions**: `translate-room` function for Korean-to-English translation

### Key File Structure

```
src/
├── lib/
│   ├── supabase.ts        # Supabase client initialization
│   ├── database.types.ts  # Generated Supabase types
│   └── types.ts           # App-specific TypeScript types
├── hooks/
│   ├── useAuth.ts         # Authentication state & methods
│   ├── useRooms.ts        # Room list with realtime updates
│   └── useMessages.ts     # Messages with realtime subscription
├── components/
│   ├── Auth.tsx           # Login/signup form
│   ├── RoomList.tsx       # Chat room sidebar
│   ├── ChatView.tsx       # Main chat area
│   ├── ChatHeader.tsx     # Room header with translate button
│   ├── MessageBubble.tsx  # Individual message display
│   └── MessageInput.tsx   # Message composition
└── App.tsx                # Main app with state orchestration
```

### Data Flow
1. `useAuth` manages Supabase auth state globally
2. `useRooms` fetches rooms and subscribes to room/message changes
3. `useMessages(roomId)` fetches and subscribes to messages for a specific room
4. Translation triggers `supabase.functions.invoke('translate-room')` which updates `content_en` field

### Environment Variables
Required in `.env` (prefix `VITE_` for browser access):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Database Schema
- **rooms**: `id` (uuid), `name` (text), `created_at` (timestamp)
- **messages**: `id` (uuid), `room_id` (uuid FK), `user_id` (uuid), `content_ko` (text), `content_en` (text), `created_at` (timestamp)
