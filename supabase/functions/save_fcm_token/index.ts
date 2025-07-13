import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_code, fcm_token, device_info } = await req.json();

    if (!user_code || !fcm_token) {
      return new Response(
        JSON.stringify({ error: 'User code and FCM token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving FCM token for user_code:', user_code);

    // Spara eller uppdatera FCM token
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_code,
        fcm_token,
        device_info: device_info || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'fcm_token',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving FCM token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save FCM token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('FCM token saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'FCM token saved successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save_fcm_token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});