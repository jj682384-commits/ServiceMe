# ServiceMe - Design Guidelines

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
- **Floating Action Button**: "Request Service" (emergency red, always visible)

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
- **Insets**: top: insets.top + Spacing.xl, bottom: insets.bottom + Spacing.xl

#### Map Screen (Driver & Provider - different variants)
- **Layout**: Full-screen map with floating elements
- **Header**: Transparent, no default navigation header
- **Main Content**: Map view (react-native-maps equivalent)
  - User's current location marker
  - Provider locations (Driver mode) / Request locations (Provider mode)
- **Floating Elements**:
  - Top: Search bar for address entry (white card, subtle shadow)
  - Bottom: Slide-up panel for active service or quick actions
  - All floating elements: shadow with shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
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
- **Submit Button**: Fixed at bottom of modal, large, emergency red
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

### Color Palette
- **Primary (Emergency Red)**: #DC2626 (for Request Service FAB, urgent actions)
- **Primary Dark**: #991B1B (pressed state)
- **Secondary (Trust Blue)**: #2563EB (for provider actions, links)
- **Success**: #16A34A (service completed, available status)
- **Warning**: #F59E0B (en route status)
- **Background**: #F9FAFB (light mode), #111827 (dark mode)
- **Surface**: #FFFFFF (light), #1F2937 (dark)
- **Text Primary**: #111827 (light), #F9FAFB (dark)
- **Text Secondary**: #6B7280
- **Border**: #E5E7EB

### Typography
- **Headings**: System font, Bold, 24-28pt (emergency contexts use larger)
- **Body**: System font, Regular, 16pt
- **Captions**: System font, Regular, 14pt
- **Buttons**: System font, Semibold, 16-18pt

### Visual Design
- **Icons**: Feather icons from @expo/vector-icons
  - Map markers: Use colored circle backgrounds
  - Service types: Use large icons (32pt) with labels
- **Touch Feedback**: All buttons use opacity: 0.7 on press
- **FAB Shadow** (Request Service button only):
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- **Cards**: 12pt border radius, no shadow (use subtle border instead)
- **Bottom Sheets**: 20pt top border radius

### Required Assets
1. **Service Type Icons** (6 custom illustrations):
   - Flat tire (tire with wrench)
   - Jump start (battery with lightning bolt)
   - Tow truck (hook icon)
   - Fuel delivery (gas pump)
   - Lockout (key)
   - Other (ellipsis)
   - Style: Simple, two-tone (primary color + background)

2. **User Avatars** (5 presets for Driver profiles):
   - Professional, automotive-themed abstract avatars
   - Colors: Blue, green, orange, purple, teal gradients
   - Circular, minimal geometric designs

3. **Provider Vehicle Icons** (3 types):
   - Tow truck, Service van, Pickup truck
   - Side-view silhouettes

### Accessibility
- Minimum touch target: 44×44pt
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- All interactive elements have accessible labels
- Emergency/urgent actions use red + text labels (not color alone)
- Map markers include text labels for service types
- Support VoiceOver/TalkBack with semantic labels