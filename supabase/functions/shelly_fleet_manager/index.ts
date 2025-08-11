import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

interface SFMCredentials {
  username: string;
  password: string;
  url: string;
}

interface SFMTokens {
  access_token: string;
  refresh_token: string;
}

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

    const { action, credentials, userCode } = await req.json();

    // Normalize incoming credentials shape (client may send {server, username, password})
    const normalizedCreds: SFMCredentials | null = credentials
      ? {
          username: credentials.username,
          password: credentials.password,
          url: credentials.server ?? credentials.url,
        }
      : null;

    if (action === 'authenticate') {
      if (!normalizedCreds?.url) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing SFM server URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await authenticateWithSFM(normalizedCreds);
      
      if (tokens) {
        // Store tokens in database for the user
        await storeTokensForUser(supabase, userCode, tokens, normalizedCreds.url);
        
        return new Response(
          JSON.stringify({ success: true, tokens }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'subscribe') {
      // Start WebSocket connection to SFM
      const wsUrl = await startSFMWebSocket(supabase, userCode);
      
      return new Response(
        JSON.stringify({ success: true, websocketUrl: wsUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: cred, error: credError } = await supabase
        .from('sfm_credentials')
        .select('sfm_url')
        .eq('user_code', userCode)
        .maybeSingle();

      if (credError) {
        return new Response(
          JSON.stringify({ success: false, error: credError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, connected: !!cred, sfm_url: cred?.sfm_url ?? null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Shelly Fleet Manager function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function authenticateWithSFM(credentials: SFMCredentials): Promise<SFMTokens | null> {
  try {
    // Build robust HTTP(S) auth URL based on provided WS/HTTP URL
    let base: URL;
    try {
      base = new URL(credentials.url);
    } catch (_) {
      console.error('Invalid SFM URL provided:', credentials.url);
      return null;
    }
    const protocol = base.protocol === 'ws:' ? 'http:' : base.protocol === 'wss:' ? 'https:' : base.protocol;
    const authBase = `${protocol}//${base.host}`;
    const authUrl = `${authBase}/rpc/user.authenticate?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;

    console.log('Authenticating with SFM:', authUrl);
    
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (response.status === 200) {
      const responseData = await response.json();
      return {
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token
      };
    } else {
      console.error('SFM Authentication error:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error authenticating with SFM:', error);
    return null;
  }
}

async function storeTokensForUser(supabase: any, userCode: string, tokens: SFMTokens, url: string) {
  try {
    // Store or update SFM credentials for user
    const { error } = await supabase
      .from('sfm_credentials')
      .upsert({
        user_code: userCode,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        sfm_url: url,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing SFM tokens:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in storeTokensForUser:', error);
    throw error;
  }
}

async function startSFMWebSocket(supabase: any, userCode: string): Promise<string> {
  try {
    // Get stored credentials
    const { data, error } = await supabase
      .from('sfm_credentials')
      .select('*')
      .eq('user_code', userCode)
      .single();

    if (error || !data) {
      throw new Error('No SFM credentials found for user');
    }

    // Resolve WebSocket URL from stored credentials or fallback
    let wsUrl: string = data.sfm_url || 'wss://shellyfl-t7-eu.shelly.cloud/shelly';
    if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
    if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
    console.log('Connecting to SFM WebSocket:', wsUrl);

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    let requestCounter = 0;

    ws.onopen = () => {
      console.log('Connected to SFM WebSocket');
      
      // Subscribe to all events
      const subscribeMessage = {
        jsonrpc: '2.0',
        id: ++requestCounter,
        method: 'FleetManager.Subscribe',
        src: 'LOVABLE_APP',
        dst: 'FLEET_MANAGER',
        params: {
          events: [
            'Shelly.Connect',
            'Shelly.Message', 
            'Shelly.Disconnect',
            'Shelly.Status',
            'Shelly.Settings',
            'Entity.StatusChange',
            'Shelly.KVS',
            'Shelly.Info',
            'Shelly.Presence',
            'Entity.Added',
            'Entity.Removed',
            'Entity.Event',
            'NotifyStatus',
            'NotifyEvent',
          ],
          options: {
            events: {
              'Shelly.Status': {
                deny: [
                  '*:aenergy',
                  '*:consumption',
                  'em:*',
                  'em1:*',
                  'emdata:*',
                  'emdata1:*',
                  'wifi:*'
                ]
              }
            }
          }
        }
      };

      ws.send(JSON.stringify(subscribeMessage));
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('SFM Event received:', message);

        // Process different event types
        await processSFMEvent(supabase, userCode, message);
        
      } catch (error) {
        console.error('Error processing SFM message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('SFM WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('SFM WebSocket connection closed');
      // TODO: Implement reconnection logic
    };

    return wsUrl;

  } catch (error) {
    console.error('Error starting SFM WebSocket:', error);
    throw error;
  }
}

async function processSFMEvent(supabase: any, userCode: string, message: any) {
  try {
    // Handle different event types
    if (message.method === 'NotifyEvent' && message.params) {
      const { event, src } = message.params;
      
      // Handle smoke detection events
      if (event.component === 'smoke' && event.event === 'alarm') {
        console.log('Smoke alarm detected from SFM:', src, event);
        
        // Insert alarm into database with correct schema
        const { error } = await supabase
          .from('alarms')
          .insert({
            device_id: src,
            user_code: userCode,
            timestamp: new Date().toISOString(),
            smoke: true,
            alarm_type: 'smoke',
            raw_data: message
          });

        if (error) {
          console.error('Error inserting alarm:', error);
        }

        // Send push notification
        await sendSmokeNotification(supabase, userCode, src);
      }
    }

    // Handle status updates
    if (message.method === 'NotifyStatus' && message.params) {
      const { status, src } = message.params;
      
      // Update device status
      const deviceStatus = {
        device_id: src,
        user_code: userCode,
        last_seen: new Date().toISOString(),
        battery_level: status?.sys?.battery?.percent ?? null,
        temperature: status?.temperature_0?.tC ?? null,
        smoke: status?.smoke_0?.alarm ?? false,
        online: true,
        raw_data: status
      };

      const { error } = await supabase
        .from('device_status')
        .upsert(deviceStatus);

      if (error) {
        console.error('Error updating device status:', error);
      }
    }

  } catch (error) {
    console.error('Error processing SFM event:', error);
  }
}

async function sendSmokeNotification(supabase: any, userCode: string, deviceId: string) {
  try {
    // Get FCM tokens for user
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_code', userCode);

    if (error || !tokens?.length) {
      console.log('No FCM tokens found for user:', userCode);
      return;
    }

    // Send notification via FCM (simplified)
    for (const tokenData of tokens) {
      console.log('Sending smoke notification to token:', tokenData.fcm_token);
      // Implementation would call FCM API here
    }

  } catch (error) {
    console.error('Error sending smoke notification:', error);
  }
}