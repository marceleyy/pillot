// ═══════════════════════════════════════════════════════════════
//  PILLOT — Configuration Supabase
//  Fichier : src/lib/supabase.js
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

// ⚠️ Remplacer par tes vraies valeurs Supabase
// (Project Settings → API dans le dashboard Supabase)
const SUPABASE_URL = 'https://vqzgxpleyczeaciobwhy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxemd4cGxleWN6ZWFjaW9id2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODEwNjIsImV4cCI6MjA5OTU1NzA2Mn0.HuZZDyi0y6IiemGaPlzCZGewuPkyk424XxNJpCdYjgo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
