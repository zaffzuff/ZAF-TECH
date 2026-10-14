# ZAF Tech

**Independent Pi Network ecosystem observatory and utility platform**

ZAF Tech is an independent, community-developed project for exploring observable Pi Network ecosystem data, public Mainnet activity, app availability, developer utilities, wallet observations, and local Pi Node diagnostics.

- **Live website:** [zaf-tech.vercel.app](https://zaf-tech.vercel.app)
- **Guided Pi onboarding:** [Start with Pi](https://zaf-tech.vercel.app/start-with-pi)
- **PDF guide:** [Pi Network Starter Guide 2026](https://zaf-tech.vercel.app/ZAF_Tech_Pi_Network_Baslangic_Rehberi_2026.pdf)
- **Repository:** [zaffzuff/ZAF-TECH](https://github.com/zaffzuff/ZAF-TECH)

ZAF Tech is **not affiliated with or endorsed by the Pi Network Core Team**. It is an independent project and does not represent an official Pi Network service.

## What the platform includes

### Pulse and ecosystem overview
- A concise overview of observable Pi Mainnet activity and ecosystem changes.
- Observed transaction and operation pace, sampled transaction success, ledger observations, and source coverage when available.
- Clear distinction between observed data, missing data, and unverified claims.

### Automatic updates and editorial maintenance
- The Latest Ecosystem Update card uses dated publications from the official Pi RSS feed, with the official blog listing as a fallback. Publications are ordered by source date, not page link order or the curated statistics list.
- While the dashboard is open, observations refresh every minute. Successful news reads are cached for five minutes per server instance; failed reads are retried after one minute. The publication date, last attempted check, and last successful check are shown separately.
- If both official news sources fail, the last successful news observation is shown with an unavailable-source notice. Recovery uses server memory and, when `DATABASE_URL` is configured, stored ecosystem snapshots across server restarts. A new instance without historical storage may have no previous observation to show.
- The existing daily `/api/apps/health/cron` job also collects Mainnet and ecosystem observations before checking app availability. Production scheduling requires the existing `CRON_SECRET` configuration; persistent history additionally requires `DATABASE_URL`. These settings and successful scheduled runs must be verified in the deployment environment.
- Guides, translations, feature explanations, and curated official statistics remain editorial content and require periodic review. An observation timestamp does not change the publication date of that evidence.

### Discover and app health
- Pi ecosystem app directory and app detail views.
- App URL checks and observable app metadata.
- App Health checks, history, and trends where supporting observations are available.
- Ecosystem app activity, staking observations, statistics, change detection, and historical trends.

### Network, DeFi, and ecosystem signals
- Public Pi Mainnet observations and ledger-related data.
- Testnet asset views kept distinct from Mainnet observations.
- DeFi, DEX, AMM and pools, token, and Launchpad observation areas.
- Radar, Trust, activity signals, and ecosystem graph views.

Data availability depends on accessible sources. A listed app, token, or ecosystem feature is not automatically verified merely because it appears in a directory or observation view.

### Wallet observations and developer utilities
- Public wallet and transaction observations where supported by accessible sources.
- Wallet activity and balance-related information without asking users for private wallet credentials.
- Pi-related developer utilities and public transaction inspection.

**Never enter or share a Pi Wallet passphrase, seed phrase, private key, account password, or verification code with ZAF Tech.** Always verify official destinations before using wallet-related services.

### Guided onboarding and PDF guide
The [Start with Pi](https://zaf-tech.vercel.app/start-with-pi) page provides a guided introduction to six first steps: opening an invitation, finding the official Pi app, account registration, starting a mining session, installing Pi Browser, and learning Wallet safety.

The page includes a downloadable [Pi Network Starter Guide 2026 (PDF)](https://zaf-tech.vercel.app/ZAF_Tech_Pi_Network_Baslangic_Rehberi_2026.pdf). The guide is educational: it does not promise rewards, KYC approval, or Mainnet migration.

The onboarding flow uses the invitation username `zaffzuff`. Account creation and all account actions must be completed by the user inside official Pi destinations.

### Local Pi Node diagnostics
The optional **ZAF Tech Node Connector** is a local Windows companion for users who run Pi Node on their own computer. It can report technical observations such as:
- Docker/container state and restart count.
- Stellar Core build, protocol, and synchronization state.
- Ledger information, peers, quorum observations, and local port checks.
- Local node resource and history information when available.

The Connector is designed for **local, read-only diagnostics**. It does not offer remote control of the node, change node settings, or expose Docker to the public internet. Its local service binds to `127.0.0.1:39100`.

Connector documentation and packaging files are available in [tools/zaf-node-connector-package](https://github.com/zaffzuff/ZAF-TECH/tree/master/tools/zaf-node-connector-package).

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | ZAF Tech dashboard and ecosystem observatory |
| `/start-with-pi` | Guided onboarding and downloadable PDF guide |
| `/ecosystem/[slug]` | Details for an ecosystem app |
| `/about` | About the project and its scope |
| `/privacy` | Privacy and data scope |

## Languages

The main dashboard supports:
- English
- Turkish
- Spanish
- Chinese
- Italian
- French
- German
- Portuguese
- Russian

The guided onboarding page is currently available in English and Turkish.

## Data principles and limitations

ZAF Tech prioritizes evidence that can be inspected over unsupported claims.

- Public network values describe sampled observations; they are not necessarily completed calendar-day totals.
- Activity and trend views are descriptive, not forecasts or guarantees of future performance.
- Source availability is not equivalent to full content verification.
- Historical persistence is optional and depends on the database configuration.
- Node diagnostics are intended to remain local to the user; the Connector itself does not upload node diagnostics to a central server.
- Features that rely on external sources may be unavailable, incomplete, or delayed.

## Technology stack

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **PostgreSQL-compatible storage** for optional historical persistence
- **GitHub Actions** for build and workflow validation
- **Vercel** for deployment
- Public Pi Network/Mainnet data sources
- Local ZAF Tech Node Connector for read-only Pi Node diagnostics

## Local development

Requirements: a compatible Node.js installation and npm.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the production build locally:

```bash
npm start
```

Run the Node Connector:

```bash
npm run node:connector
```

Additional project checks:

```bash
npm run regression
npm run smoke
```

## Optional database configuration

Historical persistence uses a PostgreSQL-compatible database configured through the `DATABASE_URL` environment variable.

Without `DATABASE_URL`, live observation and health-check features that do not require database-backed history can still operate. Database-dependent historical storage remains unavailable.

## Deployment

The project is configured for Vercel deployment. Commits pushed to the connected production branch can trigger a new deployment.

A successful build alone does not guarantee that every external data source or optional service is available at runtime. Configure any required environment variables and optional database services for the environment where they are used.

## Project status

ZAF Tech is actively evolving. The current focus is a stable, observation-first platform, clearer ecosystem discovery, guided Pi onboarding, transparent data limitations, and local read-only node diagnostics.

The repository does not currently declare an open-source license. Unless a license is added, its contents remain subject to the default copyright protections that apply to them.
