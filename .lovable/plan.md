
The implementation of dark mode will involve setting up the theme infrastructure and providing users with a way to toggle between light and dark modes. Since the project already has `next-themes` and Tailwind CSS configured for class-based dark mode, I will bridge the gap by adding the necessary provider and UI components.

### Proposed Changes

#### 1. Infrastructure
- **Create `src/components/theme-provider.tsx`**: This will be a small wrapper around the `next-themes` `ThemeProvider` to ensure consistent behavior and handle any potential hydration issues.
- **Update `src/App.tsx`**: Wrap the entire application (inside `QueryClientProvider` and `TooltipProvider`) with the `ThemeProvider`. This will allow any component to access and change the theme using the `useTheme` hook.

#### 2. UI Components
- **Create `src/components/ThemeToggle.tsx`**: A reusable button component that toggles between light and dark modes. I will use icons from `lucide-react` (`Sun` and `Moon`) for visual feedback.
- **Update `src/components/layout/AppSidebar.tsx`**: Integrate the `ThemeToggle` at the bottom of the sidebar, near the user profile and logout button. This ensures it's always accessible.
- **Update `src/components/SettingsForm.tsx`**: Add an "Appearance" section to the settings page. This aligns with the user's current location and provides a centralized place to manage preferences.

#### 3. Styling Enhancements
- Ensure all components are using Tailwind's semantic colors (like `bg-background`, `text-foreground`, `border-border`) which are already defined in `src/index.css` for both light and dark modes.

### Technical Details
- **Theme Strategy**: Use the `class` strategy (already set in `tailwind.config.ts`).
- **Default Theme**: I'll set the default to `system` to respect the user's OS settings, but the toggle will allow them to override it.
- **Library**: `next-themes` for state management and local storage persistence.

```text
File structure changes:
src/
├── components/
│   ├── theme-provider.tsx (New)
│   ├── ThemeToggle.tsx (New)
│   ├── layout/
│   │   └── AppSidebar.tsx (Updated)
│   └── SettingsForm.tsx (Updated)
└── App.tsx (Updated)
```

This approach provides a robust dark mode implementation that is persistent across sessions and easily accessible to the user.
