# My Finance App

A personal finance management application built with Vue 3, TypeScript, and Supabase.

## Features

- **Dashboard**: Overview of your financial health
- **Transactions**: Track income and expenses
- **Budgets**: Set spending limits and monitor progress
- **Categories**: Organize transactions by category
- **Secure Authentication**: Email/password or magic link login
- **Real-time Updates**: Powered by Supabase

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Charts**: Chart.js + Vue-chartjs
- **Forms**: VeeValidate + Yup
- **Utilities**: date-fns, currency.js, @vueuse/core

## Prerequisites

- Node.js 20.19.0+ or 22.12.0+
- npm or yarn
- Supabase account (free tier works great!)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Quick version:**
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local`
3. Add your Supabase URL and anon key
4. Run the SQL scripts from SUPABASE_SETUP.md
5. Create your user account

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and sign in!

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code with ESLint
npm run format   # Format code with Prettier
```

## Project Structure

```
my-finance-app/
├── src/
│   ├── assets/          # CSS and static assets
│   ├── components/      # Reusable components
│   │   ├── common/
│   │   ├── transactions/
│   │   ├── charts/
│   │   └── budgets/
│   ├── views/           # Page components
│   ├── stores/          # Pinia stores
│   ├── router/          # Vue Router config
│   ├── lib/             # Utilities (Supabase client, etc.)
│   ├── types/           # TypeScript types
│   └── composables/     # Composition API composables
├── public/              # Static assets
└── SUPABASE_SETUP.md   # Supabase configuration guide
```

## Security

This app is designed for **single-user** personal use with the following security measures:

- **Row Level Security (RLS)**: All database queries are filtered by authenticated user ID
- **Authentication Required**: All routes except login require authentication
- **Secure by Default**: Uses Supabase's anon key (safe to expose publicly)
- **No Service Role Key**: Service role key never exposed in frontend

Even though the website is public, only YOU can access YOUR data after logging in.

## Development

### Adding a New Feature

1. Create necessary components in `src/components/`
2. Add views in `src/views/`
3. Create Pinia store in `src/stores/` if needed
4. Update router in `src/router/index.ts`
5. Add database schema in Supabase if needed

### Database Schema

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the complete schema including:
- `profiles` - User profile information
- `categories` - Transaction categories
- `transactions` - Income and expense records
- `budgets` - Monthly budget limits

## Deployment

### GitHub Pages (Automatic)

This project is configured to automatically deploy to GitHub Pages on every push to the `main` branch.

**Setup Steps:**

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin main
   ```

2. **Configure GitHub Secrets:**
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

3. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Under "Build and deployment"
   - Set Source to **GitHub Actions**

4. **Wait for deployment** - The workflow will automatically trigger and deploy your app

**Your app will be live at:** `https://masachetti.github.io/my-finance-app/`

The deployment workflow (`.github/workflows/deploy.yml`) will:
- Build the app with type checking
- Run on every push to main branch
- Automatically deploy to GitHub Pages

### Vercel (Alternative)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Netlify (Alternative)

1. Push your code to GitHub
2. Import project in [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Settings
6. Deploy!

### Other Platforms

This is a standard Vite app and can be deployed anywhere that supports static sites.

## Customization

### Theme Colors

Edit `tailwind.config.js` to customize the primary color scheme:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors here
      }
    }
  }
}
```

### Features to Add Next

- [ ] Transaction filtering and search
- [ ] Data visualization with charts
- [ ] Export data to CSV/Excel
- [ ] Recurring transactions
- [ ] Budget alerts and notifications
- [ ] Multi-currency support
- [ ] Receipt attachments
- [ ] Savings goals

## Troubleshooting

**App won't start?**
- Run `npm install` to ensure all dependencies are installed
- Check that Node version is 20.19.0+ or 22.12.0+
- Verify `.env.local` exists with correct values

**Can't sign in?**
- Check Supabase setup is complete
- Verify email confirmation is disabled in Supabase Auth settings
- Check browser console for errors

**Data not loading?**
- Verify RLS policies are set up correctly
- Check Network tab for Supabase API errors
- Ensure you're signed in with the correct account

## License

This is a personal project. Feel free to use and modify as needed.

## Support

For questions about:
- **Vue/Vite**: Check [Vue docs](https://vuejs.org) and [Vite docs](https://vitejs.dev)
- **Supabase**: See [Supabase docs](https://supabase.com/docs)
- **Tailwind**: Visit [Tailwind docs](https://tailwindcss.com)

---

Built with ❤️ for personal finance management
