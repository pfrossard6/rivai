import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ypfvunexypcnbjayripc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZnZ1bmV4eXBjbmJqYXlyaXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTkzOTksImV4cCI6MjA5NDM3NTM5OX0.5f4nPvS2N7RHn50da2ozo7g7Be5fXCSPSEJTNj7nInE'

export const supabase = createClient(supabaseUrl, supabaseKey)