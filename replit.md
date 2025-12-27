# ServiceMe - Roadside Assistance Mobile App

## Overview

ServiceMe is a cross-platform mobile application that connects drivers in need of roadside assistance with nearby service providers. The app features a dual-user interface supporting both drivers seeking help (flat tires, jump starts, towing, fuel delivery, lockouts) and service providers offering these services. Built with React Native and Expo for mobile deployment, with an Express backend for API services.

**Core Value Proposition**: Fast, proximity-based connections between stranded drivers and local service providers with real-time communication and service tracking.

**Provider Messaging Priority**: The app emphasizes that ANYONE can sign up as a provider to help others and earn extra income on their own time - similar to Uber's gig model. No professional mechanic experience required. Key messaging themes:
- "Earn Helping Others" - welcoming everyday people
- "No experience needed" - lowering barriers to entry
- "Work on your own schedule" - flexibility focus
- "You're making a difference" - community-driven motivation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (React Native + Expo)

**Framework**: Expo SDK 54 with React Native 0.81, targeting iOS, Android, and web platforms.

**Navigation**: React Navigation with a hybrid structure:
- `RootStackNavigator` - Top-level native stack for main flows and modals
- `DriverTabNavigator` / `ProviderTabNavigator` - Bottom tab navigators for role-specific experiences
- Role-based routing determined at runtime based on user selection

**State Management**:
- `AppContext` - Global application state via React Context (user role, current service requests, driver/provider profiles)
- `@tanstack/react-query` - Server state management for API data fetching and caching

**UI/UX Approach**:
- Dark-first design system with electric cyan (#00D9FF) and coral (#FF6B35) accent colors
- Glassmorphic effects using `expo-blur` for iOS, fallback to solid colors on Android
- Spring-based animations via `react-native-reanimated` for micro-interactions
- Platform-adaptive styling (blur effects on iOS, solid backgrounds on Android/web)

**Key UI Components**:
- `ThemedView` / `ThemedText` - Theme-aware base components
- `Card` - Elevated surface with optional glassmorphic effect
- `Button` - Animated pressable with spring feedback
- `KeyboardAwareScrollViewCompat` - Cross-platform keyboard handling

**Maps Integration**: `react-native-maps` for displaying service provider locations and driver positions.

**Location Services**: `expo-location` for obtaining user coordinates to find nearby providers.

### Backend Architecture (Express + Node.js)

**Server Framework**: Express.js with TypeScript, running on port 5000.

**API Pattern**: RESTful API with `/api` route prefix. Currently minimal implementation with routes registered in `server/routes.ts`.

**CORS Configuration**: Dynamic origin validation based on Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`).

**Development Server**: Uses `tsx` for TypeScript execution during development.

### Data Layer

**ORM**: Drizzle ORM with PostgreSQL dialect, schema defined in `shared/schema.ts`.

**Current Schema**: Basic users table with UUID primary key, username, and password fields.

**Storage Pattern**: `IStorage` interface in `server/storage.ts` with `MemStorage` in-memory implementation. Designed for easy swap to database-backed storage.

**Schema Validation**: Zod schemas generated via `drizzle-zod` for type-safe API input validation.

### Shared Code

The `shared/` directory contains code shared between client and server:
- `schema.ts` - Database schema definitions and Zod validation schemas
- TypeScript path alias `@shared/*` configured for both environments

### Path Aliases

- `@/*` → `./client/*` (client-side code)
- `@shared/*` → `./shared/*` (shared utilities and schemas)

Configured in both `tsconfig.json` and `babel.config.js` for universal resolution.

## External Dependencies

### Mobile/Frontend
- **Expo**: App framework and build tooling (SDK 54)
- **React Navigation**: Navigation library with native stack and bottom tabs
- **React Native Maps**: Map display for location-based features
- **Expo Location**: GPS and location services
- **React Native Reanimated**: Animation engine for UI transitions
- **Expo Blur**: iOS glassmorphic effects
- **TanStack React Query**: Async state management

### Backend
- **Express**: HTTP server framework
- **PostgreSQL**: Primary database (via `pg` driver)
- **Drizzle ORM**: Database queries and migrations
- **Zod**: Runtime schema validation

### Development
- **TSX**: TypeScript execution for development server
- **Drizzle Kit**: Database migration tooling
- **ESBuild**: Production server bundling

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required for database operations)
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS`: Replit environment domains for CORS