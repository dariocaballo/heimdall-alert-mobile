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

    const { user_code, limit = 50 } = await req.json();

    if (!user_code) {
      return new Response(
        JSON.stringify({ error: 'User code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hämta alla enheter för denna user_code först
    const { data: userDevices, error: devicesError } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('user_code', user_code);

    if (devicesError) {
      console.error('Error fetching user devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userDevices || userDevices.length === 0) {
      return new Response(
        JSON.stringify({ 
          alarms: [],
          count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceIds = userDevices.map(d => d.device_id);

    // Hämta larmhistorik för användarens enheter
    const { data: alarms, error: alarmsError } = await supabase
      .from('alarms')
      .select(`
        id,
        timestamp,
        device_id,
        smoke,
        temp,
        battery,
        alarm_type,
        location,
        acknowledged,
        acknowledged_at,
        raw_data
      `)
      .in('device_id', deviceIds)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (alarmsError) {
      console.error('Error fetching alarms:', alarmsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch alarm history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatera data för appen
    const formattedAlarms = alarms?.map(alarm => ({
      id: alarm.id,
      timestamp: alarm.timestamp,
      deviceId: alarm.device_id,
      deviceName: alarm.device_id?.slice(-4) || 'Unknown',
      smoke: alarm.smoke,
      temperature: alarm.temp,
      battery: alarm.battery,
      type: alarm.alarm_type || 'smoke',
      location: alarm.location,
      acknowledged: alarm.acknowledged || false,
      acknowledgedAt: alarm.acknowledged_at,
      rawData: alarm.raw_data
    })) || [];

    return new Response(
      JSON.stringify({ 
        alarms: formattedAlarms,
        count: formattedAlarms.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get_alarm_history:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});