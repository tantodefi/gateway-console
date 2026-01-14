# fn-1.1 Project Setup & Configuration

## Description

Initialize the React + Vite project with all required dependencies and configuration.

### Setup Tasks

1. **Create Vite React project** with TypeScript
2. **Install dependencies**:
   - wagmi, viem, @tanstack/react-query (wallet)
   - @xmtp/browser-sdk, @xmtp/content-type-text (messaging)
   - @mantine/hooks (localStorage persistence)
   - tailwindcss, autoprefixer, postcss (styling)
3. **Initialize Shadcn** via MCP tool
4. **Configure environment variables** (.env.example)
5. **Setup project structure**:
   ```
   src/
   ├── components/
   │   ├── ui/          # Shadcn components
   │   ├── wallet/      # Wallet connection
   │   ├── funding/     # Faucet & deposit
   │   ├── users/       # User management
   │   └── messaging/   # Chat UI
   ├── hooks/
   ├── lib/
   │   ├── wagmi.ts     # wagmi config
   │   ├── xmtp.ts      # XMTP helpers
   │   └── constants.ts # Contract addresses
   ├── contexts/
   └── types/
   ```

### Key Files to Create

- `vite.config.ts` - Vite configuration
- `tailwind.config.js` - Tailwind setup
- `src/lib/wagmi.ts` - wagmi config with Base Sepolia
- `src/lib/constants.ts` - Contract addresses from funding portal
- `.env.example` - Environment variable template

### Reference

- Funding portal structure: `~/Developer/funding-portal/src/`
- Contract addresses: `~/Developer/funding-portal/environments/testnet-staging.json`
## Acceptance

- [ ] `npm run dev` starts development server without errors
- [ ] Tailwind CSS classes work in components
- [ ] At least one Shadcn component installed (Button)
- [ ] wagmi config created with Base Sepolia chain
- [ ] Environment variables documented in .env.example
- [ ] TypeScript compiles without errors
- [ ] Project structure matches planned layout
## Done summary
Initialized React + Vite project with TypeScript, Tailwind CSS v4, and Shadcn UI.

Key accomplishments:
- Created Vite 5 React TypeScript project
- Installed wagmi, viem, @tanstack/react-query for wallet connectivity
- Installed @xmtp/browser-sdk for messaging
- Installed @mantine/hooks for localStorage persistence
- Configured Tailwind CSS v4 with PostCSS
- Initialized Shadcn UI and added Button component
- Created project directory structure (components, hooks, lib, contexts, types)
- Created lib/constants.ts with contract addresses from funding portal
- Created lib/wagmi.ts with Base Sepolia and mainnet configuration
- Created .env.example documenting all environment variables
- Verified npm run dev starts without errors
- Verified TypeScript compiles without errors
## Evidence
- Commits:
- Tests:
- PRs: