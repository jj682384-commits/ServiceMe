# ServiceMe - Roadside Assistance Mobile App

## Overview
ServiceMe is a cross-platform mobile application designed to connect drivers needing roadside assistance with nearby service providers. It offers a dual-user interface for both drivers seeking help (e.g., flat tires, jump starts, towing, fuel delivery, lockouts) and individuals or professionals providing these services. The core value proposition is to provide fast, proximity-based connections with real-time communication and service tracking. The project aims to empower individuals to become service providers, fostering a gig-economy model similar to Uber, emphasizing "Earn Helping Others," "No experience needed," and "Work on your own schedule." The business vision is to become a leading platform for on-demand roadside assistance, offering market potential through its flexible provider model and comprehensive service offerings, including specialized EV services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React Native and Expo SDK 54, targeting iOS, Android, and web. Navigation uses React Navigation, with global state managed by `AppContext` and server state by `@tanstack/react-query`. The UI/UX features a dual-mode design system: dark mode uses a deep navy base (`#0A0E27`) with electric cyan/coral neons; light mode uses a rich sky-blue base (`#C8DCFF`) with white floating cards and deep saturated primaries (`#C4341E` coral, `#0055B3` blue). Glassmorphic effects, spring-based animations, and constellation particle backgrounds using `react-native-svg`. Location services via `expo-location`. The EV Charger Map uses a list-based UI.

### Backend
The backend is an Express.js server developed with TypeScript, providing a RESTful API. It includes dynamic CORS configuration for Replit environments.

### Data Layer
The application uses a PostgreSQL database (via the `pg` Pool in `server/db.ts`) for all persistent server-side data. Three tables are provisioned: `providers`, `jobs`, and `reports`. Zod schemas and Drizzle ORM utilities are used for type-safe validation. Common code (e.g., schema definitions) is shared between client and server via a `shared/` directory. In-memory stores remain only for ephemeral real-time state: WebSocket chat history, admin session tokens, and SmartCar OAuth tokens.

### Key Features
- **Smart Issue Detection**: AI-powered diagnostic flow recommending services and estimating costs.
- **Emergency Mode**: One-tap SOS activation with GPS sharing and trusted contact notifications.
- **Premium Membership**: Subscription tiers with benefits like free services and priority response.
- **EV Mode Tab**: Dedicated section for electric vehicles, offering EV-specific services like mobile charging and EV-safe towing, along with range alerts.
- **Vehicle Profiles**: Management of multiple vehicle profiles. Provider vehicle screen has smart make/model pickers that switch between standard passenger car data and commercial tow truck data (14 manufacturers, 62 models, 6 wrecker classes) depending on the selected vehicle type. Tow truck class selection (Light-Duty Wrecker, Flatbed/Rollback, Heavy-Duty Wrecker, etc.) is stored alongside the model. Same smart pickers are available during provider sign-up.
- **Provider Management**: Preferred provider identification, verified technician badges, and provider browsing with filtering.
- **Financial Management**: Detailed service receipts, enhanced tipping options, breakdown history, and secure payment method management.
- **Legal Compliance**: Mandatory acceptance of legal documents during sign-up.
- **Service Scheduling**: Users can choose immediate or scheduled service requests.
- **Provider Sign-Up Flow**: Multi-step registration for independent helpers and roadside shops, including ID verification.
- **Real-Time Job Dispatch**: Driver service requests are posted to a shared `pendingJobs` queue in AppContext. The provider Jobs screen reads live from this queue. On acceptance, the job moves to `activeRequest` for the provider and is removed from the queue. Both sides share the same WebSocket conversation ID (`request.id`) so chat is linked to the job.
- **Production-Ready Data**: All mock/placeholder data removed — no seeded providers, no fake history, no hardcoded users. `providerStore` on the server starts empty. `nearbyProviders`, `requestHistory`, and `paymentMethods` all start empty in AppContext. Real providers register via ProviderSignUp flow and appear via `/api/providers/nearby`.
- **Full Data Persistence**: `vehicles`, `paymentMethods`, `requestHistory`, `emergencyContacts`, and `backgroundPreferences` all persist across app restarts via AsyncStorage (alongside the existing `currentDriver`/`currentProvider`/`userRole`). Logout clears all persisted user data.
- **EV Charger Map**: Replaced hardcoded San Francisco mock data with live OpenChargeMap API (free, no key required). Uses `expo-location` to get user's actual position, shows real nearby stations with DC Fast/Level 2 detection, handles location denied and fetch error states with retry.
- **Report a Problem**: Now posts to `/api/reports` server endpoint which stores reports in `reportStore`. Reports include category, description, userId, and userRole. Returns a report ID on success.
- **Support Chat**: Live chat in SupportScreen now calls `/api/support/chat` backed by OpenAI `gpt-4o`. Maintains full conversation history in a ref for context-aware multi-turn responses. Falls back to offline message on error.
- **Live Messages Screens**: Driver and Provider Messages screens derive conversations from `requestHistory` (no mock data). Driver sees entries with a provider assigned; provider sees entries with a driver attached. Tapping opens the real WebSocket chat using the request ID as the conversation key.
- **Billing History**: Reads from `requestHistory` filtered to `status === "completed"`. `totalCost` is written by `ServiceCompletionScreen` after tip selection. `driver` field is now stamped on every new service request for provider-side visibility.
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
- **react-native-svg**: SVG rendering for constellation background animation

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
- **expo-sms**: Native SMS composer for SOS emergency contact alerts.

## Implementation Notes

### SOS SMS
- Uses `expo-sms@~14.0.8` (device native SMS composer — no external account needed)
- Fires at "dispatched" phase (~7s) in `EmergencyModeScreen.tsx`
- Sends driver name, GPS coords, and Google Maps link to all saved emergency contacts
- Silently skipped on web and when no contacts are saved
- **Twilio upgrade pending**: Account suspended on signup; reactivation email sent. Once reinstated, store `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` as secrets and replace expo-sms with a `/api/sos/sms` server endpoint for silent background sending.

### Live Chat (WebSockets)
- `ws` package on server; native `WebSocket` API on client
- `server/routes.ts` hosts the WebSocket server at `/ws` on the same HTTP server as Express
- `client/hooks/useChat.ts` manages connection, history, reconnect, and message state
- Messages stored in memory per `conversationId` (Map), max 200 per conversation
- Auto-reply simulation fires when no peer is in the same room (2–4s delay)

### Google Sign-In
- Web-only via `GoogleSignInButton` component (returns null on native to avoid crashes)
- Uses only `webClientId` from `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

### Push Notifications
- `expo-notifications@~0.32.16`; guarded with `Platform.OS !== "web"`
- Android channels: `default` (cyan) and `emergency` (red)
- Named helpers in `client/lib/notifications.ts`; hook in `client/hooks/usePushNotifications.ts`
- Navigation on tap via `client/lib/navigationRef.ts`