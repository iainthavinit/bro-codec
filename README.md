# BRO_CODEC v2.1

AI-powered bro culture survival kit. Translate, decode, vibe-check, and curate the finest bro energy from across the internet.

**[Live Demo →](https://bro-codec-site.vercel.app)**

## Architecture

```
bro-codec/
├── site/                    # Frontend (Vercel)
│   ├── css/base.css         # Shared styles
│   ├── js/
│   │   ├── supabase.js      # Supabase client
│   │   ├── utils.js         # Shared utilities
│   │   ├── prompts.js       # AI prompt definitions
│   │   └── tools.js         # Main tools page logic
│   ├── index.html           # Main tools page
│   ├── memes.html           # Public meme gallery
│   └── admin.html           # Admin panel (auth required)
├── worker/                  # Cloudflare Worker (API)
│   ├── worker.js            # Worker code
│   └── wrangler.toml        # Worker config
├── vercel.json              # Vercel routing config
└── index.html               # Root redirect
```

## Stack

- **Frontend:** Vanilla HTML/CSS/JS on Vercel
- **API:** Cloudflare Worker (Groq + Llama 3.3 70B)
- **Database:** Supabase (quotes, memes, auth)
- **Storage:** Supabase Storage (meme images)
- **Content Pipeline:** Reddit → AI scoring → distillation → KV bank

## Deployment

### Frontend (Vercel)
Connect this repo to Vercel. Pushes to `main` auto-deploy.

### Worker (Cloudflare)
```bash
cd worker && npx wrangler deploy
```

## Features

- ⚡ **Translate** — Convert normal text to bro dialect
- 💬 **Respond** — Generate the perfect bro response
- 💀 **Shitpost** — Curated bro tweets from Reddit pipeline
- 🖼️ **Memes** — AI-powered meme caption generator
- 🔓 **Decode** — Translate bro-speak to English
- 🔮 **Vibe Check** — Check if your message will survive a bro server
- 📖 **Glossary** — Bro slang dictionary
- ⚔️ **Comeback** — Calibrated comeback generator
- 🖼️ **Meme Vault** — Public gallery of curated bro memes
- 🔐 **Admin Panel** — Add quotes and memes from X, Discord, YouTube, etc.
