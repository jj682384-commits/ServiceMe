# ServiceMe - V2 Modern Design (2025)

## Design Direction: Dark-First, High-Contrast

This is a completely reimagined design system optimized for modern, fast-paced interactions. The aesthetic is sleek, dark, and focused on maximum visibility with electric cyan and vibrant coral accents.

## Core Message: Fast, Nearby Service

**Mission**: Reliable connectivity between drivers and service providers with zero wasted time. Every interaction is optimized for speed and proximity—find nearby help in minutes, not hours.

**Key Brand Values**:
- ⚡ **Speed**: Fast response times, quick connections, instant service
- 📍 **Proximity**: Only nearby providers, hyper-local service area
- 🔗 **Connectivity**: Seamless two-way communication
- ✅ **Reliability**: Vetted providers, transparent ETAs

## Modern Design Principles

This app embraces cutting-edge 2025 design trends:
- **Dark-First**: Dark slate background with maximum contrast for readability and reduced eye strain
- **Neon Accents**: Electric cyan and vibrant coral create a modern, high-tech aesthetic
- **Bold Typography**: Large, clear type hierarchy
- **Minimalist Surfaces**: Clean cards with minimal borders, maximum whitespace
- **Dynamic Shadows**: Colored shadows (coral/cyan) add depth and energy
- **Smooth Micro-interactions**: Spring animations on all interactions

## Color Palette

**Primary Action (Coral)**:
- Main: #FF6B35 (Vibrant Coral)
- Dark: #E54B1B (Deep Coral - pressed state)
- Light: #FF8C5A (Bright Coral - hover)

**Secondary Action (Electric Cyan)**:
- Main: #00D9FF (Electric Cyan)
- Dark: #00A8CC (Cyan Dark - pressed state)

**Accent (Neon Lime)**:
- #39FF14 (Bright Lime - notifications, alerts)

**Status Colors**:
- Success: #00E676 (Green)
- Warning: #FFB300 (Amber)
- Error: #FF5252 (Red)

**Backgrounds**:
- Root: #0A0E27 (Dark Navy - dark mode)
- Surface: #0F1419 (Near Black)
- Secondary: #151D35 (Dark Blue-Gray)
- Tertiary: #1A2442 (Medium Blue-Gray)

**Text**:
- Primary: #F0F2F5 (Off-White)
- Secondary: #B4BAC4 (Gray)

## Typography

- **Display**: 36pt, Bold, +0.5 letter spacing
- **h1**: 32pt, Bold
- **h2**: 28pt, Bold
- **h3**: 24pt, Semibold
- **h4**: 20pt, Semibold
- **Body**: 16pt, Regular
- **Small**: 14pt, Regular
- **Button**: 16pt, Semibold

## Visual Design

**Cards**:
- Border radius: 16-20pt
- Background: Slight color variation (backgroundSecondary)
- No shadow by default; colored shadow on hover/interaction
- Minimal borders for clean, modern look

**Buttons**:
- Primary: Vibrant coral gradient background
- Secondary: Cyan background with strong contrast
- Border radius: 12pt
- Height: 52pt
- Text: Bold, centered

**Floating Action Button (FAB)**:
- Size: 64pt
- Background: Vibrant coral with 35% shadow opacity
- Icon: 28pt, white
- Always visible on driver map screen

**Bottom Sheets & Modals**:
- Border radius: 24pt
- Dark background with subtle border
- Clear title area with close button

**Icons**:
- Feather icons, 20-24pt standard
- Color: Match context (cyan for secondary, coral for primary, lime for alerts)

**Micro-interactions**:
- Press: Scale 0.95 with spring animation
- Hover: Colored shadow appears
- Transitions: 200ms smooth ease

## Architecture Decisions

### Navigation

**Driver Mode - Tab Navigation (4 tabs + FAB)**:
- Tab 1: Map (home screen)
- Tab 2: History (past requests)
- Tab 3: Messages
- Tab 4: Profile
- FAB: "Get Help Fast" button (coral, always visible)

**Provider Mode - Tab Navigation (4 tabs)**:
- Tab 1: Dashboard (earnings, active jobs)
- Tab 2: Jobs (nearby requests)
- Tab 3: Messages
- Tab 4: Profile

### Key Screens

**Role Selection Screen**:
- Full-screen, centered
- Logo at top
- "Help is Nearby" headline
- Two large tappable cards (Driver / Provider)
- Coral and Cyan color coding

**Driver Map Screen**:
- Full-screen map with floating elements
- Search bar at top (dark background, cyan icons)
- Active service indicator at bottom
- Nearby provider markers with names/ratings

**Service Request Modal**:
- Dark background with cyan accents
- Service type grid (6 options)
- Location confirmation (GPS-based)
- Notes input field
- Large coral CTA button at bottom

**Provider Dashboard**:
- Stat cards with coral left border
- Availability toggle at top
- Active jobs section
- Weekly earnings chart
- Profile quick access

## Accessibility

- Minimum touch target: 44×44pt
- Color contrast: 4.5:1 for text, 3:1 for UI elements
- All interactive elements have semantic labels
- Support VoiceOver/TalkBack with clear descriptions
