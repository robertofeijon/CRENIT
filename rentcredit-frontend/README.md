# RentCredit Frontend

This is a bare‑bones React + Vite frontend styled after the provided admin dashboard design. It currently includes the top bar, sidebar navigation, and a sample tenant home page. Additional views can be implemented under `src/App.tsx`.

## Setup

```bash
cd rentcredit-frontend
npm install   # or yarn
npm run dev   # starts Vite on http://localhost:5173
```

The backend must be running (`rentcredit-backend` on port 3000) for API calls.

Demo credentials are seeded automatically on backend startup:

```
tenant@example.com / tenant123   (tenant role)
landlord@example.com / landlord123   (landlord role)
```

A sign‑up page is available at `/signup` if you want to create additional users; just click the link on the login page.

Use the login form to obtain a JWT; the token is stored in memory and added to subsequent API requests.

## Structure

- `src/App.tsx` – main layout and state logic
- `src/styles.css` – global stylesheet copied from the design
- `src/main.tsx` – entry point

## Next Steps

- Implement the remaining pages (payments, credit, etc.) by converting the template strings in `App.tsx` to JSX; some pages already demonstrate live API calls (Payments, Overview).
- Replace the placeholder data with calls to `/api` endpoints using `fetch` or `axios`
- Add routing (e.g. React Router) as the view logic grows
- Store JWT token and add an API client utility (already partly implemented in `src/api`)

Feel free to restructure components into their own files as the app matures.