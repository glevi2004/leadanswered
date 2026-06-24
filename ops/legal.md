# Legal & Compliance

Operating name: **Answered** / **Lead Answered**. Legal entity: **Grovebox LLC**.
Public docs: [Privacy Policy](../platform/landing-page/privacy/index.html) (`/privacy`) and
[Terms of Service](../platform/landing-page/terms/index.html) (`/terms`) on the landing site.
Contact: levi@leadanswered.com.

> Internal operating note — **not legal advice**. The live Terms/Privacy, the new Terms §3,
> and any contractor agreement should be reviewed by counsel before scaling.

---

## SMS compliance — two layers

Lead Answered sends SMS to homeowners on behalf of contractors. Two distinct things have to be
true, and they are often confused:

### Layer 1 — Carrier / A2P registration ("are we allowed to send?")
- All sending numbers are registered A2P traffic through **Twilio**.
- **v1 = toll-free numbers** with Twilio toll-free verification (legal name, address, EIN/BRN,
  use-case, **opt-in details**, sample messages). Unverified toll-free can send during the grace
  period, so a new contractor goes live immediately while verification completes. (SCOPE.md §9.6)
- **Local numbers = future paid upgrade**, which requires **A2P 10DLC** brand/campaign
  registration.
- Twilio **Advanced Opt-Out** auto-handles `STOP` / `HELP` / `UNSUBSCRIBE` for US numbers, and
  opt-in/help language is included.
- **Registration ≠ TCPA.** This layer is carrier/CTIA compliance and a prerequisite to send — it
  does not, by itself, make us TCPA compliant.

### Layer 2 — TCPA + state law ("did the person consent?")
- Our model is **inbound / solicited**: a homeowner submits a contractor's contact or
  quote-request form, providing their number to be contacted about *that* request; we reply within
  ~60s as the contractor's assistant. Responding to a consumer's own inquiry is the strongest
  consent posture under the TCPA.
- The sample intake form (`/optin`) captures an **explicit, unchecked, optional** SMS-consent
  checkbox (no pre-ticking; consent is not required to submit the form). Affirmative opt-in is the
  gold standard for automated texts.
- **Operational control:** only initiate SMS to leads who affirmatively opted in. A lead submitted
  without the consent flag must **not** be texted. (Enforce this in the lead intake — see TODO.)
- **Quiet hours:** TCPA limits solicitation to 8am–9pm local time, and some state "mini-TCPAs"
  (FL, OK, WA, etc.) are stricter. An immediate reply to a same-moment inquiry is defensible, but
  the "we text at any hour" angle must not be applied to anything marketing-flavored.

---

## Division of responsibility (why our "TCPA compliant" claim holds)

| We (Answered / Grovebox LLC) provide | The Contractor (customer) is responsible for |
|---|---|
| Registered A2P sender (toll-free now, 10DLC later) | Obtaining valid prior express consent |
| Automatic STOP / HELP opt-out handling | Only submitting leads who requested contact |
| Opt-in / help language + business identification | No cold, purchased, scraped, or rented lists |
| Recordkeeping of the conversation | Honoring opt-outs; accurate registration info |

The contractor's obligations are now **contractually bound in Terms of Service §3 — Terms for
Contractors**, including an indemnification clause. The landing-page **"TCPA compliant"** chip is
defensible because (a) we run a registered, opt-out-enabled, solicited-inbound system, and (b) the
Terms push consent responsibility to the contractor. If a contractor feeds in non-consented
numbers, the exposure is contractually theirs — but we must still enforce the opt-in flag
operationally.

---

## HIPAA

**Not applicable.** The initial vertical is home-services contractors (roofing), not healthcare.
The earlier "HIPAA compliant" landing claim was removed. Do not advertise HIPAA unless we knowingly
serve a covered entity and sign BAAs.

---

## Open items / TODO

- [ ] Counsel review of Privacy, Terms (esp. the new §3), and a contractor agreement.
- [ ] Stand-alone **Contractor Services Agreement** at signup carrying the §3 obligations +
      indemnification, accepted via an explicit checkbox.
- [ ] **Enforce the consent flag** in lead intake — never SMS a lead without affirmative opt-in.
- [ ] Periodic spot-check of contractor consent practices; suspend on suspected violations.
- [ ] Keep registered sample-messages / opt-in copy in sync with what's actually sent.

---

**Related:** Terms `/terms` · Privacy `/privacy` · sample intake `/optin` ·
[SCOPE.md](../platform/SCOPE.md) §9.6 (number provisioning & verification) ·
[playbook/04-stack.md](../playbook/04-stack.md).
