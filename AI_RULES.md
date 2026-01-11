# AI Rules for Latte POS Application

This document outlines the core technologies used in the Latte POS application and provides guidelines for using specific libraries and tools.

## Tech Stack Overview

*   **Frontend Framework**: React for building interactive user interfaces.
*   **Language**: TypeScript for type safety and improved code quality.
*   **Build Tool**: Vite for a fast development experience and optimized builds.
*   **Styling**: Tailwind CSS for utility-first styling, ensuring responsive and consistent designs.
*   **UI Components**: shadcn/ui, built on Radix UI, for accessible and customizable UI components.
*   **Routing**: React Router DOM for declarative navigation within the application.
*   **Data Fetching & State Management**: React Query for server state management and React Context for global client-side state.
*   **Backend & Database**: Supabase for database, authentication, and serverless functions.
*   **Icons**: Lucide React for a comprehensive set of vector icons.
*   **Mobile Integration**: Capacitor for building native Android and iOS applications from the web codebase.
*   **Charting**: Recharts for displaying data visualizations and statistics.

## Library Usage Rules

To maintain consistency, performance, and best practices, please adhere to the following rules when developing:

1.  **Frontend Framework**: Always use **React** for UI development.
2.  **Language**: All new code and modifications must be written in **TypeScript**.
3.  **Styling**:
    *   Use **Tailwind CSS** exclusively for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for global overrides.
    *   Utilize the `cn` utility function (from `src/lib/utils.ts`) for conditionally applying and merging Tailwind classes.
4.  **UI Components**:
    *   Prioritize using components from **shadcn/ui** (`src/components/ui/`).
    *   If a required component is not available in `shadcn/ui` or needs significant custom logic, create a new component in `src/components/` and style it with Tailwind CSS. **Never modify files within `src/components/ui/`**.
5.  **Routing**: Use **React Router DOM** for all navigation. Keep main application routes defined in `src/App.tsx`.
6.  **Data Fetching & Server State**: Use **React Query** (`@tanstack/react-query`) for all asynchronous data operations (fetching, caching, mutations) interacting with Supabase.
7.  **Global Client State**: For application-wide client state (e.g., current employee, cart, dark mode), use the **POSContext** (`src/contexts/POSContext.tsx`).
8.  **Database Interactions**: All database operations must go through the **Supabase client** (`@supabase/supabase-js`) imported from `src/integrations/supabase/client.ts`.
9.  **Icons**: Use icons from **Lucide React**.
10. **Date Manipulation**: Use **date-fns** for all date formatting, parsing, and manipulation tasks.
11. **Toast Notifications**: Use **Sonner** for all transient, non-blocking notifications to the user.
12. **QR/Barcode Scanning**:
    *   For web-based camera scanning, use **@yudiel/react-qr-scanner**.
    *   For native mobile camera scanning, use the `nativeScannerService` (`src/lib/nativeScannerService.ts`) which wraps `@capacitor-mlkit/barcode-scanning`.
13. **QR Code Generation**: Use the **qrcode** library for generating QR codes (e.g., for customer loyalty or order IDs).
14. **Mobile-Specific Features**: For native device functionalities (e.g., Bluetooth printing, camera access), leverage **Capacitor** and its plugins. The `BluetoothPrinter` plugin (`src/plugins/bluetooth-printer/`) is specifically for thermal printer communication.
15. **Charting**: Use **Recharts** for any data visualization requirements.
16. **Reorderable Lists**: For lists that require drag-and-drop reordering, use the custom **SwipeableListItem** and **SwipeableList** components (`src/components/admin/SwipeableListItem.tsx`).