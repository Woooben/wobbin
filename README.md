# Wobbin

A personal UI reference library inspired by Mobbin.

## Current features

- App package library
- Screens / Flows / UI Elements browsing
- Folder, multi-image and ZIP import
- Supabase cloud sync across devices
- Supabase Storage for screenshots
- Cover selection
- Single and batch screenshot deletion
- App package deletion
- Dark / light mode
- App Store logo lookup
- One-click migration from the previous local IndexedDB library

## Access model

- Public visitors can browse the library.
- Upload, delete, and cover-management actions require the Wobbin administrator passphrase.
- The administrator passphrase itself is not stored in this GitHub repository.

## Deployment

- Frontend: Vercel
- Database: Supabase Postgres
- Screenshot assets: Supabase Storage
- Admin write API: Supabase Edge Function

Production: https://wobbin.vercel.app
