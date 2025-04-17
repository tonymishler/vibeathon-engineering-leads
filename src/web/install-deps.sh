#!/bin/bash

# Install shadcn/ui
npx shadcn-ui@latest init

# Install components
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add button
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress

# Install other dependencies
npm install recharts
npm install better-sqlite3
npm install date-fns
npm install @radix-ui/react-dialog
npm install @radix-ui/react-tabs
npm install @radix-ui/react-progress 