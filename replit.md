# ServiceMe - Roadside Assistance Mobile App

## Overview
ServiceMe is a cross-platform mobile application designed to connect drivers in need of roadside assistance with nearby service providers. It offers a dual-user interface for both drivers seeking help (e.g., flat tires, jump starts, towing, fuel delivery, lockouts) and individuals or professionals providing these services. The core value proposition is to provide fast, proximity-based connections with real-time communication and service tracking. The project aims to empower everyday individuals to become service providers, fostering a gig-economy model similar to Uber, emphasizing "Earn Helping Others," "No experience needed," and "Work on your own schedule." The business vision is to become a leading platform for on-demand roadside assistance, offering market potential through its flexible provider model and comprehensive service offerings, including specialized EV services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (React Native + Expo)
The frontend is built with React Native and Expo SDK 54, targeting iOS, Android, and web. Navigation is managed by React Navigation, utilizing a hybrid structure with `RootStackNavigator` and role-specific tab navigators. Global state is handled via `AppContext`, while `@tanstack/react-query` manages server state. The UI/UX features a dark-first design with electric cyan and coral accents, incorporating glassmorphic effects using `expo-blur` (iOS) and spring-based animations via `react-native-reanimated`. Key UI components include theme-aware elements, `Card` for elevated surfaces, and `KeyboardAwareScrollViewCompat` for keyboard handling. Location services and mapping are integrated using `expo-location` and `react-native-maps`.

### Backend Architecture (Express + Node.js)
The backend is an Express.js server developed with TypeScript, providing a RESTful API with a `/api` prefix. It features dynamic CORS configuration to support Replit environments.

### Data Layer
The application uses Drizzle ORM with a PostgreSQL dialect for database interactions, with schema definitions in `shared/schema.ts`. `MemStorage` serves as an in-memory storage implementation designed for easy future migration to a persistent database. Zod schemas generated via `drizzle-zod` ensure type-safe API input validation.

### Shared Code
A `shared/` directory contains code common to both client and server, such as schema definitions, accessible via `@shared/*` path aliases.

### Key Features
- **Smart Issue Detection**: A 3-step guided diagnostic flow with AI-powered diagnosis, recommending services and providing estimated costs.
- **Emergency Mode**: One-tap SOS activation for priority dispatch, including GPS location sharing and trusted contact notifications.
- **Premium Membership**: Subscription tiers offering benefits like free services, discounts, and priority response.
- **EV Mode Tab**: A dedicated section for electric vehicle owners with a unique futuristic UI, offering EV-specific services like mobile charging and EV-safe towing.
- **EV Mobile Charge**: Screen for requesting on-demand mobile EV charging with different charge levels.
- **EV Tow**: Screen for requesting EV-safe towing with options like flatbed transport.
- **Range Alert**: Configurable alerts for EV battery range based on thresholds and proximity to chargers.
- **Vehicle Profiles**: Management of multiple vehicle profiles with make, model, fuel type, and default vehicle settings.
- **Preferred Providers**: Automatic identification and badging of providers based on service history, with loyalty levels.
- **Verified Technician Badges**: Trust badges displayed on provider profiles indicating specializations or achievements.
- **Price Anchoring**: Comparison of ServiceMe pricing against traditional roadside assistance costs to highlight savings.
- **Service Receipt/Invoice**: Detailed digital receipts for completed services with itemized breakdowns.
- **Enhanced Tipping**: User-friendly tipping options with clear messaging about provider benefits.
- **Breakdown History**: Comprehensive history of past services with summary statistics and detailed views.
- **Payment Methods**: Secure management of multiple payment cards and selection of a default method.
- **Billing History**: Overview of all transactions, including service payments and premium membership charges.
- **Legal Compliance**: Mandatory acceptance of Privacy Policy, Terms of Service, and Liability Disclaimer during sign-up.
- **Provider Browsing**: Functionality to browse, sort, and filter service providers, with detailed provider profiles.

## External Dependencies

### Mobile/Frontend
- **Expo**: App framework
- **React Navigation**: Navigation
- **React Native Maps**: Mapping
- **Expo Location**: Location services
- **React Native Reanimated**: Animations
- **Expo Blur**: UI effects
- **TanStack React Query**: Async state management

### Backend
- **Express**: Web server
- **PostgreSQL**: Database
- **Drizzle ORM**: ORM
- **Zod**: Schema validation

### Development
- **TSX**: TypeScript execution
- **Drizzle Kit**: Database migration
- **ESBuild**: Production bundling

### EV Add Vehicle Screen
- Dedicated dark-themed EV vehicle add screen at `client/screens/ev/EVAddVehicleScreen.tsx`
- Techno intro animation: expanding ring, scan line, hex grid, then fades to form
- Background matches EV homepage with `EVAnimatedBackground`
- Form: Make, Model, Year, Tire Type — fuel type locked to Electric
- Registered as `EVAddVehicle` in RootStackNavigator (fullScreenModal + fade)
- EV gate button navigates to `EVAddVehicle` instead of `VehicleManagement`

### Service Scheduling
- Users can choose "Now" (immediate) or "Schedule" (future date/time) when requesting any service
- Schedule mode shows scrollable date cards (next 14 days) and a time slot grid (7:00 AM - 9:00 PM, 30-min intervals)
- Express Service is hidden when scheduling (only available for immediate requests)
- Scheduled requests are saved with status "pending" and `scheduledDate` field on `ServiceRequest`
- History screen and detail screen both display scheduled date with "Scheduled" badge
- Submit button text adapts: "Connect Nearby Provider" (now) vs "Schedule Service" (later)

### Fuel Delivery Pricing
- Fuel Delivery uses a dual-mode pricing picker: "Choose Amount" (preset $10-$50 in $5 steps) and "Enter Custom" (free-form text input)
- Custom fuel amount validates before allowing submission (must be > 0)
- Premium members see discounted pricing on both preset and custom amounts

### Animated Background System
- History, Messages, and Profile tabs use AnimatedBackground with floating orbs and a slowly rotating ghosted logo
- Headers are hidden on these tabs — screen titles are rendered inline within scrollable content
- Background preferences stored in AppContext: `BackgroundPreferences` with `mode` ("animated"|"solid") and `colorScheme`
- 7 color schemes: Default, Ocean, Sunset, Aurora, Midnight, Ember, Noir — each has unique `bgColor`, `flashColor`, `colors[][]`, and `opacityBoost`
- AnimatedBackground component at `client/components/AnimatedBackground.tsx` accepts `customColors`, `opacityBoost`, and `flashColor` props
- Dramatic flash/burst transition animation plays when switching schemes (scale + ring + fade)
- BackgroundSettingsScreen at `client/screens/BackgroundSettingsScreen.tsx` — accessible from Profile > Preferences > Background Style
- Scheme preview cards show miniature dark backgrounds with colored orbs representing each scheme
- Solid mode disables all motion and uses `theme.backgroundRoot`; animated mode uses scheme's `bgColor`

### Environment Variables
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_DOMAINS`