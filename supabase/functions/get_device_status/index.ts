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

    const { user_code } = await req.json();

    if (!user_code) {
      return new Response(
        JSON.stringify({ error: 'User code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hämta device status via view
    const { data: devices, error } = await supabase
      .from('device_overview')
      .select('*')
      .eq('user_code', user_code);

    if (error) {
      console.error('Error fetching device status:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch device status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatera data för appen
    const formattedDevices = devices?.map(device => ({
      device_id: device.device_id,
      name: device.device_id?.slice(-4) || 'Unknown',
      online: device.online || false,
      smoke: device.smoke || false,
      temperature: device.temperature || null,
      battery: device.battery_level || null,
      signal: device.signal_strength || null,
      last_seen: device.last_seen,
      raw_data: device.latest_data
    })) || [];

    return new Response(
      JSON.stringify({ 
        devices: formattedDevices,
        count: formattedDevices.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get_device_status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});