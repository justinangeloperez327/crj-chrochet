# Authentication and customer accounts

## Identity model

Authentication uses three Prisma models:

- `User` — login identity and role
- `AuthSession` — opaque server-side sessions
- `Customer` — commerce profile, addresses, and orders

A customer created previously through guest checkout is linked to the new user account when they register with the same normalized email address. Existing guest orders therefore remain visible after account creation.

Roles:

- `CUSTOMER`
- `ADMIN`

## Password storage

Passwords are never stored directly.

The application uses Node.js `crypto.scrypt` with:

- a unique 16-byte random salt
- a 64-byte derived key
- timing-safe verification

The stored password value includes the scrypt parameters, salt, and derived hash so parameters can be upgraded later.

Registration currently requires at least 12 characters.

## Sessions

Successful login creates a 32-byte random opaque session token.

The browser receives the raw token in an HTTP-only cookie:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production
- 30-day expiry

Only a SHA-256 hash of the token is stored in PostgreSQL.

Logout deletes the current database session and expires the cookie.

Expired database sessions are rejected even if the browser still presents a cookie.

## Route protection

`proxy.ts` provides the early redirect for:

- `/account/*`
- `/admin/*`

Proxy checks for the presence of the session cookie only.

Database validation and authorization happen inside server layouts/actions:

- `requireUser()`
- `requireAdmin()`

This keeps authorization decisions server-side and database-backed.

## Customer account

`/account` includes:

- profile
- order summary
- wishlist count
- address count

Additional routes:

- `/account/orders`
- `/account/wishlist`
- `/account/addresses`

Customers can update their profile, add/remove addresses, choose a default address, and view all orders associated with their commerce customer record.

Address mutations always scope records to the authenticated customer's ID.

## Wishlist

Guest wishlist state remains local to the browser.

When a signed-in user opens the storefront, the header loads their database wishlist and synchronizes local UI state to it.

Heart actions update local UI immediately and also persist the change through `/api/wishlist` when a valid account session exists.

The account wishlist page reads the database as the source of truth.
