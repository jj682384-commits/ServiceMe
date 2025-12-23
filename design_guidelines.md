# ServiceMe - Modern Design Guidelines (2025)

## Core Message: Fast, Nearby Service

**Mission**: Reliable connectivity between drivers and service providers with zero wasted time. Every interaction is optimized for speed and proximity—find nearby help in minutes, not hours.

**Key Brand Values**:
- ⚡ **Speed**: Fast response times, quick connections, instant service
- 📍 **Proximity**: Only nearby providers, hyper-local service area
- 🔗 **Connectivity**: Seamless two-way communication
- ✅ **Reliability**: Vetted providers, transparent ETAs

## Modern Design Principles

This app embraces contemporary design trends with:
- **Glassmorphism**: Layered frosted glass effects with blur and subtle tints
- **Bold Gradients**: Vibrant, dynamic color transitions for primary actions
- **Micro-interactions**: Smooth, premium animations on all interactive elements
- **Minimalist Clarity**: Clean typography and generous negative space
- **Color Dynamism**: Rich, saturated accent colors that feel current

## Architecture Decisions

### Authentication
**Auth Required** - This is a two-sided marketplace requiring:
- **Primary Auth**: Apple Sign-In (iOS) + Google Sign-In (Android/cross-platform)
- **Onboarding Flow**: After auth, users select their role (Driver or Service Provider)
  - Role selection screen with clear, large cards for each option
  - Users can switch roles in Settings (requires re-verification for Service Provider)
- **Service Provider Verification**: Additional verification screen requiring:
  - Business license upload (photo picker)
  - Insurance documentation
  - Vehicle information
  - Service types offered (multi-select checkboxes)
  - Mock approval status in prototype

### Navigation Architecture

**Driver Mode - Tab Navigation (4 tabs + FAB):**
- Tab 1: Map (home screen with current location)
- Tab 2: History (past service requests)
- Tab 3: Messages (conversations with providers)
- Tab 4: Profile (account, payment methods, settings)
- **Floating Action Button**: "Request Service" (vibrant gradient, always visible)

**Service Provider Mode - Tab Navigation (4 tabs):**
- Tab 1: Dashboard (earnings, active jobs)
- Tab 2: Jobs (available requests nearby)
- Tab 3: Messages
- Tab 4: Profile (ratings, vehicle info, availability toggle)

### Screen Specifications

#### Role Selection Screen (First-time only)
- **Layout**: Full-screen with two large, tappable cards
- **Header**: Custom, centered logo, no back button
- **Content**: 
  - Top: "Welcome to ServiceMe" heading
  - Two equal-height cards (60% screen height each, stacked vertically)
  - Driver card: Car icon, "I Need Help" heading, description
  - Provider card: Wrench icon, "I Provide Service" heading, description
  - Cards use glassmorphic background with subtle blur
- **Insets**: top: insets.top + Spacing.xl, bottom: insets.bottom + Spacing.xl

#### Map Screen (Driver & Provider - different variants)
- **Layout**: Full-screen map with floating elements
- **Header**: Transparent, no default navigation header
- **Main Content**: Map view (react-native-maps equivalent)
  - User's current location marker
  - Provider locations (Driver mode) / Request locations (Provider mode)
- **Floating Elements**:
  - Top: Search bar for address entry (glassmorphic background, blur effect)
  - Bottom: Slide-up panel for active service or quick actions (glassmorphic)
  - All floating elements: Blur background, subtle color tint
- **Insets**: 
  - Floating search bar: top: insets.top + Spacing.xl
  - Bottom panel: bottom: tabBarHeight + Spacing.xl

#### Service Request Screen (Modal - Driver)
- **Layout**: Modal sheet (70% screen height)
- **Header**: Custom header with "Request Service" title, X button (top-right)
- **Content**: Scrollable form
  - Service type selector (grid of 6 cards: Flat Tire, Jump Start, Tow, Fuel, Lockout, Other)
  - Location confirmation (current address, editable)
  - Additional notes (text area, 3 rows)
  - Cost estimate display (read-only, updates based on selection)
- **Submit Button**: Fixed at bottom of modal, vibrant gradient
- **Insets**: bottom: insets.bottom + Spacing.xl

#### Active Service Tracking (Driver & Provider)
- **Layout**: Split screen (Map 60% top, Details 40% bottom)
- **Header**: Default navigation header with "Service In Progress" title
  - Left: Back button (returns to map)
  - Right: Message button (opens chat)
- **Map Section**: Provider location, user location, route line
- **Details Panel** (non-scrollable):
  - Provider photo, name, rating
  - Vehicle make/model, license plate
  - Status timeline (En Route → Arrived → In Progress → Complete)
  - ETA / Elapsed time
  - "Call Provider" button
- **Insets**: bottom: Spacing.xl

#### History Screen
- **Layout**: Scrollable list
- **Header**: Default navigation header, "Service History" title
  - Right: Filter icon (opens filter modal)
- **Content**: FlatList of service cards
  - Each card: Service type icon, date/time, provider name, cost, status
  - Tap to view detailed receipt
  - Cards with glassmorphic effect on scroll
- **Insets**: 
  - top: Spacing.xl
  - bottom: tabBarHeight + Spacing.xl

#### Profile/Settings Screen
- **Layout**: Scrollable form
- **Header**: Default navigation header, "Profile" title
  - Right: Edit button (toggles edit mode)
- **Content**: Sections with grouped lists
  - Account: Avatar (generated preset), Name, Phone, Email
  - Payment Methods: Credit cards list, Add Payment button
  - Preferences: Notifications toggle, Preferred radius selector
  - Danger Zone: Switch Role, Delete Account (nested confirmations)
- **Insets**: 
  - top: Spacing.xl
  - bottom: tabBarHeight + Spacing.xl

## Design System

### Color Palette (Modern 2025)

**Primary Actions:**
- **Primary (Vibrant Purple)**: #7C3AED (for critical actions, FAB)
- **Primary Dark**: #6D28D9 (pressed state)
- **Primary Light**: #A78BFA (hover/disabled states)

**Accent Colors:**
- **Accent (Cyan)**: #06B6D4 (secondary actions, highlights)
- **Accent Dark**: #0891B2 (pressed state)
- **Accent Magenta**: #EC4899 (tertiary actions, notifications)

**Status Colors:**
- **Success**: #10B981 (service completed, available)
- **Warning**: #F59E0B (en route status, attention needed)
- **Error**: #EF4444 (cancellation, critical alerts)

**Backgrounds & Surfaces:**
- **Background**: #F9FAFB (light mode), #0F172A (dark mode)
- **Surface**: #FFFFFF (light), #1E293B (dark)
- **Surface Secondary**: #F3F4F6 (light), #334155 (dark)
- **Glassmorphic**: rgba(255, 255, 255, 0.8) with blur effect (light)
- **Glassmorphic Dark**: rgba(30, 41, 59, 0.8) with blur effect (dark)

**Text:**
- **Text Primary**: #0F172A (light), #F8FAFC (dark)
- **Text Secondary**: #64748B
- **Border**: #E2E8F0 (light), #334155 (dark)

### Gradients (Modern)

**Primary Action Gradient:**
- Start: #7C3AED (purple)
- End: #06B6D4 (cyan)
- Direction: 135deg (diagonal, bottom-left to top-right)

**Secondary Gradient:**
- Start: #06B6D4 (cyan)
- End: #EC4899 (magenta)
- Direction: 45deg

**Dark Gradient:**
- Start: #A78BFA (light purple)
- End: #22D3EE (light cyan)
- Direction: 135deg

### Typography (Modern)

- **Display**: 36pt, Bold (for hero sections)
- **Headings (h1)**: 32pt, Bold (main titles)
- **Headings (h2)**: 28pt, Bold
- **Headings (h3)**: 24pt, Semibold
- **Headings (h4)**: 20pt, Semibold
- **Body**: 16pt, Regular
- **Small**: 14pt, Regular
- **Button**: 16pt, Semibold

**Letter Spacing:**
- Headings: +0.5pt (subtle, modern feel)
- Body: Normal

### Visual Design

**Icons:**
- Feather icons from @expo/vector-icons
- Size: 20-24pt (icons in cards), 32pt (service type selector)
- Color: Match current theme (primary, accent, or text)

**Cards & Components:**
- **Border Radius**: 16-20pt (modern, not too rounded)
- **Card Elevation**: Use glassmorphic effect with blur instead of traditional shadows
- **Blur Effect**: 10-15pt blur radius for glassmorphic elements
- **Touch Feedback**: Scale 0.95 on press with spring animation

**Buttons:**
- **Primary Button**: Full width, gradient background, 52pt height
- **Secondary Button**: Outlined, accent border, 44pt height
- **Button Border Radius**: 12pt
- **Button Font**: Semibold, 16pt

**Bottom Sheets:**
- Border radius: 24pt
- Glassmorphic background with blur
- Subtle shadow effect

**Micro-interactions:**
- Button press: Scale down 0.95 with spring animation (damping: 12, stiffness: 150)
- Card tap: Scale down 0.98 with smooth transition
- Scroll effects: Glassmorphic blur increases on scroll
- Tab transitions: Smooth opacity fade (200ms)

### Accessibility

- Minimum touch target: 44×44pt
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- All interactive elements have accessible labels
- Emergency/urgent actions use clear visual hierarchy (not color alone)
- Map markers include text labels for service types
- Support VoiceOver/TalkBack with semantic labels
