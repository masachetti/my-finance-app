# Supabase Setup Guide

This guide will help you configure Supabase for your personal finance app with secure, single-user access.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: my-finance-app (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to you
4. Click "Create new project" and wait for it to initialize

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public** key (this is safe to use in your frontend)
3. Create a `.env.local` file in your project root (copy from `.env.local.example`)
4. Paste your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 3. Configure Authentication

### Email/Password Setup (Recommended)

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **Email Templates**
4. Customize templates if desired
5. Go to **Authentication** → **URL Configuration**
6. Set:
   - **Site URL**: `http://localhost:5173` (for development)
   - **Redirect URLs**: Add your production URL when you deploy

### Disable Email Confirmations (Since it's single-user)

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, click on **Email**
3. **Disable** "Confirm email" (since it's just you, no need for confirmation)
4. **Enable** "Secure email change"
5. Save changes

## 4. Create Database Schema

Run the following SQL in **SQL Editor** → **New query**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id, month)
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5. Enable Row Level Security (RLS)

**This is CRITICAL for security!** Run this SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);
```

## 6. Create Your User Account

1. Run your app locally: `npm run dev`
2. Go to `http://localhost:5173/login`
3. Enter your email and password
4. Since email confirmation is disabled, you can sign in immediately

**Alternative:** Use Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Enter your email and password
4. Click "Create user"

## 7. Security Best Practices

### What Makes This Secure for Single-User Access?

1. **Row Level Security (RLS)**:
   - Every table checks `auth.uid()` - only the authenticated user can access their data
   - Even if someone gets your anon key, they can't access data without being logged in

2. **Authentication Required**:
   - All routes (except login) require authentication
   - Router guards prevent unauthenticated access

3. **No Service Role Key in Frontend**:
   - We only use the `anon` key (safe to expose)
   - Never use the `service_role` key in your frontend code

### Additional Security Measures

1. **Use Strong Password**:
   - Your account password should be strong and unique

2. **Enable MFA (Optional but Recommended)**:
   - Go to **Authentication** → **Settings**
   - Enable "Multi-factor authentication"

3. **Monitor Access**:
   - Check **Authentication** → **Logs** periodically
   - You should only see your own login attempts

4. **API Rate Limiting**:
   - Supabase has built-in rate limiting
   - For production, consider additional rate limiting

## 8. Deployment Considerations

When deploying to production:

1. **Update URL Configuration**:
   - Add your production domain to redirect URLs
   - Update Site URL in Authentication settings

2. **Environment Variables**:
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting platform
   - Never commit `.env.local` to git

3. **SSL/HTTPS**:
   - Always use HTTPS in production
   - Supabase enforces HTTPS by default

## 9. Troubleshooting

### Can't sign in?

- Check your `.env.local` file has correct values
- Verify email confirmation is disabled in Auth settings
- Check browser console for error messages

### Data not showing?

- Verify RLS policies are enabled
- Check you're logged in with the correct account
- Inspect Network tab to see Supabase API responses

### Need to reset?

- Delete all data: **Table Editor** → Select table → Delete rows
- Reset auth: **Authentication** → **Users** → Delete user
- Drop tables: **SQL Editor** → Run `DROP TABLE` commands

## Support

For Supabase-specific issues, consult:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
