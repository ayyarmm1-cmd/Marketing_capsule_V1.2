# Marketing Capsule ERP & Website

A full-stack ERP (Enterprise Resource Planning) and marketing management platform built with React, TypeScript, Firebase, and Vite.

## Features

- **Sales & CRM**: Invoices, quotations, sales entries, client management
- **Finance**: Payments, credit notes, balance adjustments, refunds, expense tracking
- **HR**: Staff management, payroll, attendance, leave requests, holiday calendar, KPI management
- **Leads & Tasks**: Lead pipeline, task management, projects
- **Reports**: Financial reports, sales reports, activity logs
- **POS**: Point of sale system

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Hosting, Cloud Functions)

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/marketing-capsule-erp.git
   cd marketing-capsule-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Configure Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Copy your Firebase config to `firebase.ts` or use environment variables
   - Run `firebase login` and `firebase use your-project-id`

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Deploy**
   ```bash
   firebase deploy
   ```

## Project Structure

```
├── components/      # React components
├── contexts/        # React contexts (Auth, etc.)
├── hooks/           # Custom hooks
├── services/        # API & Firebase services
├── utils/           # Utility functions
├── functions/       # Firebase Cloud Functions
├── firestore.rules  # Firestore security rules
└── firebase.json    # Firebase config
```

## License

Private - All rights reserved.
