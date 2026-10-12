# Customer accounts

Customers register at `/register` with a name, email and 12–200 character password. Email ownership must be verified before sign-in. Verification links expire after 24 hours and password-reset links after 30 minutes; both are single-use. Resend verification or request recovery from the sign-in page.

Configure Resend, the sending address and `APP_URL` to enable registration and recovery. Failed email delivery does not activate an account. Existing-account registration produces the same successful response without replacing credentials; an unverified customer can request another link.

After verification, unassigned guest profiles and custom requests for that email can be linked to the account. A customer cannot claim a profile already assigned to someone else. Account pages show only that customer's orders, addresses and wishlist.

Passwords use salted scrypt hashes. Sessions use opaque random tokens whose hashes are stored in PostgreSQL. Cookies are HTTP-only, same-site, secure in production and expire after 30 days. Sign-out revokes the current session; resetting a password revokes every session. Expired or unverified sessions cannot authorize access.

Customer and administrator permissions are checked on the server. Mutating forms and JSON routes require same-origin requests. Database throttling limits repeated authentication requests by account and IP. Keep recovery and verification links confidential.
