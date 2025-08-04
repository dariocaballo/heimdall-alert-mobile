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

    const { user_code, deviceId } = await req.json();

    if (!user_code || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'user_code and deviceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating test alarm for device:', deviceId, 'user_code:', user_code);

    // Skapa testalarm i databasen
    const alarmData = {
      device_id: deviceId,
      user_code: user_code,
      smoke: true,
      temp: 25,
      battery: true,
      raw_data: {
        test: true,
        deviceId,
        smoke: true,
        temperature: 25,
        battery: 85,
        timestamp: new Date().toISOString()
      },
      alarm_type: 'test',
      timestamp: new Date(),
    };

    const { error: alarmError } = await supabase
      .from('alarms')
      .insert(alarmData);

    if (alarmError) {
      console.error('Error creating test alarm:', alarmError);
      return new Response(
        JSON.stringify({ error: 'Failed to create test alarm', details: alarmError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Uppdatera device status
    const statusUpdate = {
      device_id: deviceId,
      user_code: user_code,
      online: true,
      smoke: true,
      temperature: 25,
      battery_level: 85,
      signal_strength: -45, // Bra signal för test
      last_seen: new Date(),
      raw_data: {
        test: true,
        deviceId,
        timestamp: new Date().toISOString()
      },
    };

    const { error: statusError } = await supabase
      .from('device_status')
      .upsert(statusUpdate, { 
        onConflict: 'device_id',
        ignoreDuplicates: false 
      });

    if (statusError) {
      console.error('Error updating device status:', statusError);
    }

    // Skicka push notification
    await sendTestNotification(supabase, user_code, deviceId);

    console.log('Test alarm created successfully for device:', deviceId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test alarm created successfully',
        deviceId: deviceId,
        userCode: user_code,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing test alarm:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendTestNotification(supabase: any, userCode: string, deviceId: string) {
  try {
    // Get all FCM tokens for this user_code
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_code', userCode);

    if (error || !tokens || tokens.length === 0) {
      console.log('No FCM tokens found for user_code:', userCode);
      return;
    }

    // Send FCM notifications via Firebase Admin SDK
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const privateKeyId = Deno.env.get('FIREBASE_PRIVATE_KEY_ID');
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
    const clientId = Deno.env.get('FIREBASE_CLIENT_ID');
    
    if (!projectId || !privateKey || !clientEmail) {
      console.log('Firebase Admin SDK credentials not configured');
      return;
    }

    // Get OAuth2 access token
    const accessToken = await getFirebaseAccessToken(privateKey, clientEmail, privateKeyId, clientId);
    
    if (!accessToken) {
      console.log('Failed to get Firebase access token');
      return;
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    for (const tokenData of tokens) {
      const fcmPayload = {
        message: {
          token: tokenData.fcm_token,
          notification: {
            title: '✅ Testalarm',
            body: `Brandvarnare ${deviceId} fungerar korrekt`,
            image: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png'
          },
          data: {
            type: 'test_alarm',
            deviceId: deviceId,
            timestamp: new Date().toISOString(),
          },
          webpush: {
            notification: {
              title: '✅ Testalarm',
              body: `Brandvarnare ${deviceId} fungerar korrekt`,
              icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
              badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
              vibrate: [200, 100, 200],
              requireInteraction: false,
              actions: [
                {
                  action: 'view',
                  title: 'Öppna ID-Bevakarna'
                }
              ]
            }
          },
          android: {
            notification: {
              sound: 'default',
              priority: 'high'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        }
      };

      try {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fcmPayload)
        });

        if (response.ok) {
          console.log('Test notification sent successfully to token:', tokenData.fcm_token.slice(0, 10) + '...');
        } else {
          console.error('FCM send failed:', await response.text());
        }
      } catch (error) {
        console.error('Error sending test notification:', error);
      }
    }
    
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

async function getFirebaseAccessToken(privateKey: string, clientEmail: string, privateKeyId?: string, clientId?: string): Promise<string | null> {
  try {
    // JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: privateKeyId
    };

    // JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Base64url encode header and payload
    const headerEncoded = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadEncoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Create signature using RS256
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(`${headerEncoded}.${payloadEncoded}`);
    
    // Import private key
    const keyData = privateKey.replace(/\\n/g, '\n');
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = keyData.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
    
    const keyBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Sign the data
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Create JWT
    const jwt = `${headerEncoded}.${payloadEncoded}.${signatureBase64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get access token:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
    
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
}