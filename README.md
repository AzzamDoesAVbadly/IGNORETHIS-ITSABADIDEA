# AI-Business Local Agent

This is the local project scaffold for the milestone workflow described in the build specification.

It includes the bootstrap, milestone harness, SQLite database, local automations, and the marketing loop for a weird but useful AI business.

## Production stack recommendation

Keep the local AI loop as the system of record.

- Website hosting: free static hosting such as Cloudflare Pages, GitHub Pages, or Netlify free tier
- Payment: Stripe Checkout, not PayPal for this stack
- Email: Resend
- Outbound automation: webhook layer only, triggered by internal events
- SEO: curated RSS/public-feed sources and a local refresh queue
- Cookies: first-party only, consent-based, no stealth cross-site tracking

## Environment variables

```bash
export AI_BUSINESS_HOME="$HOME/AI-Business"
export STRIPE_SECRET_KEY="sk_live_..."
export EMAIL_PROVIDER="resend"
export RESEND_API_KEY="re_..."
export EMAIL_FROM="noreply@yourdomain.com"
export OUTBOUND_WEBHOOK_URL="https://example.com/webhook"
export SEO_FEED_URLS="https://example.com/feed.xml,https://another.example/rss.xml"
```

## Local-first design

The business loop stays local in SQLite and Python. External services are amplifiers only:

- Stripe handles payment
- Resend sends the receipt
- a webhook can trigger downstream automation
- the local site remains the system of record

## SEO policy

This system uses curated public feeds only, no hostile scraping, no fake manipulations, and no spammy rank tricks.

## Personalization policy

This site stores first-party session data only after explicit consent. It is designed to be useful without abusing the visitor.
