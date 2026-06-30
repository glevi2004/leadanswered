# Lead Answered — Email Design System

The single source of truth for **every email** the brand sends — app/transactional emails
(password reset, invites, notifications) **and** the team's personal email signatures. Keep all of
them visually consistent with the product + landing page (`leadanswered.com`). When in doubt, this
file wins.

---

## 1. Brand tokens (for email)

| Token | Value | Use |
|---|---|---|
| Logo (email) | `https://leadanswered.com/logo-email.png` (the "A" mark, ~40px tall) | header + signature |
| Wordmark | **Lead Answered** (text, not an image) | next to the logo |
| Tagline | *Every lead, answered in 60 seconds.* | footer / signature |
| Primary green | `#34c759` | accents, links, the logo dot |
| Button green | `#22b94a` | CTA button background (white text) |
| Ink (headings/body) | `#1c1d22` | primary text |
| Muted text | `#6b6f76` | secondary text, footer |
| Hairline | `#e9e9eb` | borders/dividers |
| Page background | `#f4f5f7` | outer email background |
| Card background | `#ffffff` | the email card |
| Font stack | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` | everything (Inter won't load in most clients → the fallbacks carry it) |

**Voice:** confident, plain, warm-but-professional — same as the landing page. Short sentences. Lead
with the benefit. No jargon, no exclamation spam. One clear action per email.

**Hard rules:**
- **Inline styles + tables only.** Email clients (Outlook especially) ignore `<style>` blocks and
  flexbox/grid. Every style is inline; layout is `<table>`-based.
- **One primary CTA** per email, as the green button. Always include the raw URL as a fallback line.
- Logo is a **hosted URL** (above) with descriptive `alt` — never a local/inline image.
- Max content width **560px**; generous padding; left-aligned body text.

---

## 2. Transactional email template (master)

Drop-in HTML for **Supabase Auth emails** (Authentication → Emails → Templates) and our own
notification sends. Replace `HEADING`, `BODY`, `{{ .ConfirmationURL }}`, and the button label per
email type (see §2.1). For non-Supabase sends, swap `{{ .ConfirmationURL }}` for your link.

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e9e9eb;border-radius:14px;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <!-- Header -->
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <img src="https://leadanswered.com/logo-email.png" width="34" height="34" alt="Lead Answered"
                     style="display:inline-block;vertical-align:middle;border:0;" />
                <span style="vertical-align:middle;margin-left:10px;font-size:17px;font-weight:700;color:#1c1d22;">Lead&nbsp;Answered</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:8px 32px 8px 32px;">
                <h1 style="margin:16px 0 8px 0;font-size:22px;line-height:1.3;font-weight:700;color:#1c1d22;">HEADING</h1>
                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#3a3c42;">BODY</p>
                <!-- CTA button -->
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" bgcolor="#22b94a" style="border-radius:10px;">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                        BUTTON_LABEL
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 4px 0;font-size:13px;line-height:1.6;color:#6b6f76;">
                  Or paste this link into your browser:<br />
                  <a href="{{ .ConfirmationURL }}" style="color:#22b94a;word-break:break-all;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #e9e9eb;">
                <p style="margin:14px 0 2px 0;font-size:13px;color:#6b6f76;">Every lead, answered in 60 seconds.</p>
                <p style="margin:0;font-size:12px;color:#9a9da3;">
                  © 2026 Lead Answered ·
                  <a href="https://leadanswered.com/privacy" style="color:#9a9da3;">Privacy</a> ·
                  <a href="https://leadanswered.com/terms" style="color:#9a9da3;">Terms</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### 2.1 Per-email copy (Supabase templates)

| Supabase template | Subject | HEADING | BODY | BUTTON_LABEL |
|---|---|---|---|---|
| Reset Password | `Reset your Lead Answered password` | Reset your password | We got a request to reset your password. Click below to choose a new one — the link expires in an hour. If this wasn't you, you can ignore this email. | Reset password |
| Invite user | `You're invited to Lead Answered` | Set up your account | Your Lead Answered account is ready. Set a password to finish setting up and meet Sarah, your AI assistant. | Accept invite |
| Confirm signup | `Confirm your email` | Confirm your email | Confirm this address to activate your Lead Answered account. | Confirm email |
| Magic Link | `Your Lead Answered sign-in link` | Sign in to Lead Answered | Click below to sign in. The link expires shortly and can only be used once. | Sign in |

> Notification emails we send via Postmark (booking confirmed, new qualified lead, quiet-lead) should
> use the **same** template — heading = the event, body = the lead/appointment details, and either no
> button or a "View in dashboard" button to `https://app.leadanswered.com/dashboard`.

---

## 3. Personal email signature (Hostinger)

HTML signature for team mailboxes (e.g. `levi@leadanswered.com`) so **sent** mail matches the brand.
Paste into **Hostinger Webmail → Settings → Identities → Signature** with **HTML** enabled.

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td style="padding-right:14px;border-right:2px solid #34c759;vertical-align:middle;">
      <img src="https://leadanswered.com/logo-email.png" width="40" height="40" alt="Lead Answered" style="border:0;display:block;" />
    </td>
    <td style="padding-left:14px;vertical-align:middle;">
      <div style="font-size:15px;font-weight:700;color:#1c1d22;">Levi Ramos</div>
      <div style="font-size:13px;color:#6b6f76;">Founder · Lead Answered</div>
      <div style="font-size:13px;margin-top:4px;">
        <a href="mailto:levi@leadanswered.com" style="color:#22b94a;text-decoration:none;">levi@leadanswered.com</a>
        &nbsp;·&nbsp;
        <a href="https://leadanswered.com" style="color:#22b94a;text-decoration:none;">leadanswered.com</a>
      </div>
      <div style="font-size:12px;color:#9a9da3;margin-top:4px;">Every lead, answered in 60 seconds.</div>
    </td>
  </tr>
</table>
```

Swap the name/title/email per person; keep the structure, the green divider (`#34c759`), the logo,
and the tagline identical.

---

## 4. Applying it (checklist)

- [ ] Supabase → Authentication → Emails → Templates: paste the §2 HTML into **Reset Password**,
      **Invite user**, **Confirm signup**, **Magic Link**, with the §2.1 subjects/copy.
- [ ] Our Postmark notification sends (`apps/api/src/email.ts`) move from plain text to this HTML
      template (future task — note, not built yet).
- [ ] Each team mailbox in Hostinger uses the §3 signature.
- [ ] Logo stays hosted at `https://leadanswered.com/logo-email.png` (don't break that URL).
