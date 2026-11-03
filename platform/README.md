# Palate platform

The complete local app lives one directory above this file. From the Palate root:

- `npm run install:apps` installs the dashboard and menu dependencies.
- `npm run build` builds the public site into `dist/`.
- `npm test` runs the application tests.
- `npm start` serves http://127.0.0.1:8942/.

The source uses React, Radix Dialog, Lucide, Supabase JS and QRCode. The approved marketing homepage remains static. Owner and staff workspaces share components but all authorization is enforced by Supabase RLS and checked RPCs. Frontend route choices cannot grant privileges.

See `../PLATFORM-GUIDE.txt` for the owner/staff workflow, database design, configuration and verification notes.
