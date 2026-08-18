# Coding Conventions

## Data Fetching
- Always use React Query (`@tanstack/react-query`) for data fetching
- Use `fetch` for HTTP requests (not axios)
- Use API_URL from `@/config`

## Forms
- Use React Hook Form (`react-hook-form`) for form handling
- Use Zod for schema validation
- Use `@hookform/resolvers/zod` to connect Zod with React Hook Form

## Exports
- Always use named exports (`export const`), never `export default`

## Naming Conventions
- Use kebab-case for file names (e.g., `home-page.tsx`, `dashboard-card.tsx`)

## Hook Structure
- Export custom hooks from dedicated files
- Use `useQuery` for GET requests
- Name query keys descriptively: `["resource-name"]`

## File Organization
- Store all React Query hooks in `src/hooks/` folder unless otherwise specified
- Name hook files after their primary function (e.g., `use-get-categories.ts`)

## Authentication
- Create `actions.ts` file for auth functions (signup, signin, signout, etc.)
- Create `use-session.ts` hook that uses the action functions
- Use `SessionProvider` for session context
- Store auth files in `src/auth/` (or specify your preferred location)

## UI Components

### Everything is a component
- **Every piece of UI is a reusable component** in `src/components/` — even small ones like `Container`, `Card`, `Badge`. Never write repeated raw markup inline in pages.
- **Before creating anything new, check `src/components/` first.** If a component for that concept exists, reuse it or add a variant to it.

### One component per concept — no duplicates
- **Never create a second component that is the same thing** under a different name or with different colors (no `RedButton`, `SecondaryButton`, `DarkCard` as separate files).
- When you need a different look for an existing component, **add a `variant` prop value to it** instead of creating a new component.

### Variants
- Components with multiple looks take a `variant` prop; each variant has its own distinct colors from the `globals.css` palette.
- `<Button />` has **three variants**:
  - `primary` — `bg-sienna text-cream`
  - `secondary` — `bg-sand text-espresso`
  - `outline` — `border-sand bg-surface text-terracotta`
- Add new variants to the existing component file only when a design genuinely needs a new look.

### Colors
- **Only use palette tokens from `globals.css`** (`cream`, `sand`, `terracotta`, `sienna`, `espresso`, `background`, `foreground`) via Tailwind classes like `bg-sienna`, `text-espresso`.
- **Never hardcode hex values** in components.

### Button
- **Always use `<Button />` component** from `src/components/button` instead of native `<button>` elements
- Import: `import { Button } from "@/components/button";`
- This ensures consistent styling, variants, and behavior across the application

## CSS & Styling
- **Always use styles from `globals.css`** for consistent theming and reusable utility classes
- Import `globals.css` in your main entry file (e.g., `main.tsx` or `App.tsx`)
- Define global CSS variables, custom utility classes, and base styles in `globals.css`
- Use Tailwind CSS for component-specific styling
- Leverage CSS custom properties from `globals.css` in Tailwind classes when needed

## Responsive Design
- **No horizontal scroll** should appear on screens wider than 320px
- Use mobile-first approach: write styles for mobile, then add media queries for larger screens
- Use Tailwind CSS responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Set maximum widths on containers to prevent excessive stretching on large screens
- Use `max-w-screen-2xl` or similar container classes for main content areas
- Ensure images are responsive: `max-w-full h-auto` or use Tailwind's responsive image utilities
- Test all components at these breakpoints:
  - Mobile: 320px, 375px, 425px
  - Tablet: 768px, 1024px
  - Desktop: 1280px, 1440px, 1920px
- Use flexbox or grid with proper wrapping (`flex-wrap`, `grid-cols-*`)
- Avoid fixed widths; prefer `max-w-*`, `min-w-*`, and percentage-based widths
- Add `overflow-x-hidden` to body/main container if needed to prevent unintended horizontal scroll
- Use `w-full` for full-width elements within containers
- Test tables with `overflow-x-auto` wrapper on mobile devices

## SVG Icons

### File Structure
- **Location**: `src/assets/`
- **Naming**: kebab-case with `-icon.tsx` suffix (e.g., `settings-icon.tsx`)
- **Export**: Add to `src/assets/index.ts` barrel file

### Icon Component Template
```tsx
import type { SVGProps } from "react";

export function IconNameIcon({
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path d="..." fill="currentColor" />
    </svg>
  );
}
```

### Key Rules
- **Named exports only** - no `export default`
- **PascalCase** component names with `Icon` suffix
- **Default sizes**: 16x16 (small), 24x24 (standard), or custom for logos
- **Use `fill="currentColor"`** for CSS color inheritance via Tailwind
- **Include `aria-hidden="true"`** for decorative icons
- **Spread `...props`** to allow className and other attributes

### Usage
```tsx
import { IconNameIcon } from "@/assets";

<IconNameIcon width={24} height={24} className="text-blue-500" />
```

### After Creating
Add export to `src/assets/index.ts`:
```ts
export { IconNameIcon } from "./icon-name-icon";
```