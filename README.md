# SalonBook Client

Frontend web application for **SalonBook**, a salon appointment booking and beauty service platform. Built with Next.js App Router and TypeScript, it provides service browsing, category exploration, authentication and session synchronization, role-based dashboards (`client` and `admin`), dark mode support, and Stripe payment flows.

## Important Features

- **Service Discovery & Category Browsing:** Explore salon treatments, filter by category (such as Haircut & Styling, Hair Coloring, Hair Treatment, Facial & Skincare, Makeup, Manicure & Pedicure, and Spa & Massage), and view featured services on the landing page.
- **Authentication, Google OAuth & Session Sync:** Supports credential sign-in/sign-up and Google sign-in via Better Auth, `/auth/callback` handling without login-page flash, and backend JWT cookie synchronization (`salonbook_token`).
- **Role-Based Dashboards & Profile Controls:** Dedicated `/dashboard/client` and `/dashboard/admin` routes, profile management, and blocked-account handling.
- **Responsive Navigation & Dark Mode (FOUC-Free):** Responsive `Navbar` with user avatar badge, dropdown/mobile menus, and a persistent light/dark theme toggle initialized early in `RootLayout` to prevent flash of unstyled content.
- **Stripe Checkout & Payment Status Views:** Seamless redirect into Stripe Checkout for confirmed appointments and dedicated `/payment/success` and `/payment/cancel` pages.

## Technology Stack

- **Framework & Language:** Next.js (App Router), React, TypeScript
- **Authentication:** Better Auth (`@/lib/auth-client`) + `httpOnly` JWT cookie session sync with the Express backend
- **Payments:** Stripe (`@stripe/stripe-js` / Stripe Checkout flow)
- **Styling & UI:** Tailwind CSS, `lucide-react` icons, custom toast notifications

## Installation Instructions

1. Clone the client repository and navigate into the project directory:
   ```bash
   git clone <https://github.com/hmmahbubrabbani/salonbook-client.git>
   cd salonbook-client