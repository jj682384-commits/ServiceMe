# ServiceMe - Roadside Assistance Mobile App

## Overview
ServiceMe is a cross-platform mobile application designed to connect drivers needing roadside assistance with nearby service providers. It offers a dual-user interface for both drivers seeking help (e.g., flat tires, jump starts, towing, fuel delivery, lockouts) and individuals or professionals providing these services. The core value proposition is to provide fast, proximity-based connections with real-time communication and service tracking. The project aims to empower individuals to become service providers, fostering a gig-economy model similar to Uber, emphasizing "Earn Helping Others," "No experience needed," and "Work on your own schedule." The business vision is to become a leading platform for on-demand roadside assistance, offering market potential through its flexible provider model and comprehensive service offerings, including specialized EV services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React Native and Expo SDK 54, targeting iOS, Android, and web. Navigation uses React Navigation, with global state managed by `AppContext` and server state by `@tanstack/react-query`. The UI/UX features a dark-first design with electric cyan and coral accents, incorporating glassmorphic effects and spring-based animations. Location services are integrated using `expo-location`. The EV Charger Map uses a list-based UI.

### Backend
The backend is an Express.js server developed with TypeScript, providing a RESTful API. It includes dynamic CORS configuration for Replit environments.

### Data Layer
The application uses Drizzle ORM with a PostgreSQL dialect for database interactions, and `MemStorage` for in-memory storage, with future migration to a persistent database in mind. Zod schemas ensure type-safe API input validation. Common code (e.g., schema definitions) is shared between client and server via a `shared/` directory.

### Key Features
- **Smart Issue Detection**: AI-powered diagnostic flow recommending services and estimating costs.
- **Emergency Mode**: One-tap SOS activation with GPS sharing and trusted contact notifications.
- **Premium Membership**: Subscription tiers with benefits like free services and priority response.
- **EV Mode Tab**: Dedicated section for electric vehicles, offering EV-specific services like mobile charging and EV-safe towing, along with range alerts.
- **Vehicle Profiles**: Management of multiple vehicle profiles.
- **Provider Management**: Preferred provider identification, verified technician badges, and provider browsing with filtering.
- **Financial Management**: Detailed service receipts, enhanced tipping options, breakdown history, and secure payment method management.
- **Legal Compliance**: Mandatory acceptance of legal documents during sign-up.
- **Service Scheduling**: Users can choose immediate or scheduled service requests.
- **Provider Sign-Up Flow**: Multi-step registration for independent helpers and roadside shops, including ID verification.
- **Animated Background System**: Dynamic backgrounds with customizable color schemes for various screens.
- **In-App Subscriptions**: Integration with RevenueCat for managing premium memberships.
- **Push Notifications**: `expo-notifications` for various alerts (e.g., SOS activated, provider en route, job requests).
- **Google Sign-In**: Integration for user authentication.

## External Dependencies

### Mobile/Frontend
- **Expo**: App framework
- **React Navigation**: Navigation
- **Expo Location**: Location services
- **React Native Reanimated**: Animations
- **Expo Blur**: UI effects
- **TanStack React Query**: Async state management
- **expo-notifications**: Push notifications
- **react-native-purchases**: RevenueCat SDK for subscriptions

### Backend
- **Express**: Web server
- **PostgreSQL**: Database
- **Drizzle ORM**: ORM
- **Zod**: Schema validation

### Services/APIs
- **Google Maps**: `react-native-maps` for displaying real-time provider locations, active service routes, and EV charger maps.
- **RevenueCat**: For in-app subscriptions and entitlement management.
- **OpenAI**: Integrated via Replit AI for smart diagnostics (e.g., `gpt-4o`).
- **Google Sign-In**: For user authentication.