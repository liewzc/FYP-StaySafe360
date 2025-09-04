// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbsiowljnibegleiqfyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic2lvd2xqbmliZWdsZWlxZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NDM2MjksImV4cCI6MjA2NzUxOTYyOX0.ymUOnjPq6GNMN6drfz2uTNyuyjr_Xb9cfleumHIfhAk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
