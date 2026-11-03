# Publish Palate to Vercel

## 1. Import the repository

Push the complete source project to GitHub, then import it in Vercel. Keep Root Directory at the repository root and Framework Preset at **Other**. `vercel.json` already configures installation, build, output, security headers, and trailing-slash URLs.

Use a Vercel plan that allows commercial use. Vercel's Hobby plan is for personal, non-commercial projects; Palate's business use requires Pro or Enterprise under [Vercel's fair-use policy](https://vercel.com/docs/limits/fair-use-guidelines).

Do not deploy the source folder as the public output. Only `dist/` should be served. Unknown pages return a real 404; application pages each have their own generated index file.

## 2. Connect the final website address to Supabase

After deployment, replace `https://YOUR-SITE.vercel.app` below with your stable production URL (or custom domain). Use the same final domain for printed QR codes. Temporary preview URLs are not suitable for restaurant QR codes.

In [Supabase URL Configuration](https://supabase.com/dashboard/project/opxmijpsppojwpogvfwd/auth/url-configuration):

- Set **Site URL** to your production URL.
- Add these exact **Redirect URLs**:
  - `https://YOUR-SITE.vercel.app/dashboard/`
  - `https://YOUR-SITE.vercel.app/reset-password/`
  - `https://YOUR-SITE.vercel.app/invite/`
- Keep the corresponding `http://127.0.0.1:8942/` entries if you still develop locally.
- Only add preview domains you intentionally use. Do not allow every `*.vercel.app` domain.

See [Supabase's redirect guide](https://supabase.com/docs/guides/auth/redirect-urls).

In [Supabase Edge Function secrets](https://supabase.com/dashboard/project/opxmijpsppojwpogvfwd/functions/secrets), set `ALLOWED_ORIGINS` to your production origin and local origins, comma-separated, without trailing slashes:

```text
https://YOUR-SITE.vercel.app,http://127.0.0.1:8942,http://localhost:8942
```

This setting belongs in **Supabase**, not Vercel. Both recommendation and translation functions check it. Updating Vercel settings alone cannot update Supabase settings.

## 3. Configure account recovery email

Configure a verified sender under Supabase Authentication → Email → SMTP Settings. Use your chosen email provider's host, port, username, password, and verified sender address. Then test a password-reset email with an address outside your Supabase team.

Signup remains confirmation-free. Team invitations now use private one-time links shared by the inviting staff member or restaurant owner. Supabase's default email service is unsuitable for customer account recovery: [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. Backend state

The existing project `opxmijpsppojwpogvfwd` already has Palate's database. The secure-invitation migration `20261102190000_secure_invitations.sql` was applied during this preparation. Existing memberships and restaurants were preserved.

For future database changes, use `supabase login`, `supabase link --project-ref opxmijpsppojwpogvfwd`, then review `supabase db push --dry-run` before `supabase db push`. Do not run `db reset` on this project.

Vercel deploys the frontend only. It does not apply SQL migrations or deploy Supabase Edge Functions. If you change a function, deploy it separately through Supabase.

## 5. Before inviting a paying restaurant

- Open the homepage, menu, login, staff page, and dashboard by direct URL; refresh each.
- Confirm the owner signs in and can only see their own restaurant.
- Create a private invitation in Team, open it with the intended account, and verify it cannot be reused.
- Edit a dish and verify the public menu on a second device shows the saved change.
- Check photos, prices, availability, languages, and a QR scan on a phone.
- Receive and use a password-reset email on the final domain.
- Confirm an unknown URL returns the custom 404 page.
- Generate final QR codes from the production dashboard, not the local preview.

Recommendations have a rule-based fallback. Live AI and automatic translation require the provider key in Supabase; they have not been configured as part of this release. Manual translations remain available. Payments, recurring billing, and service agreements are not connected; handle them separately before starting paid service.

## 6. Keeping it updated

Edit the source, run `npm run build:vercel`, commit, and push. Vercel will build from the connected branch. The repository's GitHub workflow also checks pushes and pull requests. Avoid using production restaurant data for experimental changes; Vercel previews currently connect to the same Supabase project.

Headers and build settings follow [Vercel's project configuration](https://vercel.com/docs/project-configuration/vercel-json). The current build pins Node 22. PNG, SVG, Apple touch, and ICO favicon assets are included.
