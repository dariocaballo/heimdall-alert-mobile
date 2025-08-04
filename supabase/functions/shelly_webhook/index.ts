import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShellyData {
  deviceId: string;
  online?: boolean;
  smoke?: boolean;
  temperature?: number;
  battery?: number;
  signal?: number;
  timestamp?: string;
  raw_data?: any;
  // Shelly Plus Smoke specifika fält
  alarm?: boolean;
  test?: boolean;
  battery_low?: boolean;
  temp?: {
    tC?: number;
    tF?: number;
  };
  battery_percent?: number;
  event_type?: string; // smoke.alarm, smoke.battery_low, smoke.report
}

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

    const data: ShellyData = await req.json();
    console.log('Received Shelly data:', data);

    if (!data.deviceId) {
      return new Response(
        JSON.stringify({ error: 'Device ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hitta vilken user_code som äger denna device
    const { data: deviceOwner, error: deviceError } = await supabase
      .from('user_devices')
      .select('user_code')
      .eq('device_id', data.deviceId)
      .single();

    if (deviceError || !deviceOwner) {
      console.log('Device not found in user_devices, attempting auto-registration for:', data.deviceId);
      
      // Auto-register device to first available user if not found
      const { data: userCodes, error: userError } = await supabase
        .from('user_codes')
        .select('user_code')
        .limit(1);

      if (userError || !userCodes || userCodes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Device not registered and no users available' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Auto-register device
      const { error: registerError } = await supabase
        .from('user_devices')
        .insert([{ device_id: data.deviceId, user_code: userCodes[0].user_code }]);

      if (registerError) {
        console.error('Auto-registration failed:', registerError);
        return new Response(
          JSON.stringify({ error: 'Device registration failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Device auto-registered to user:', userCodes[0].user_code);
      deviceOwner = { user_code: userCodes[0].user_code };
    }

    // Förbättrad Shelly Plus Smoke statushantering
    const statusUpdate = {
      device_id: data.deviceId,
      user_code: deviceOwner.user_code,
      online: data.online ?? true,
      smoke: data.smoke ?? data.alarm ?? false,
      temperature: data.temperature ?? data.temp?.tC,
      battery_level: data.battery ?? data.battery_percent,
      signal_strength: data.signal,
      last_seen: data.timestamp ? new Date(data.timestamp) : new Date(),
      raw_data: data.raw_data || data,
    };

    const { error: statusError } = await supabase
      .from('device_status')
      .upsert(statusUpdate, { 
        onConflict: 'device_id',
        ignoreDuplicates: false 
      });

    if (statusError) {
      console.error('Error updating device status:', statusError);
      return new Response(
        JSON.stringify({ error: 'Failed to update device status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hantera olika typer av Shelly Plus Smoke events
    const isAlarm = data.smoke === true || data.alarm === true;
    const isTest = data.test === true;
    const isBatteryLow = data.battery_low === true || (data.battery && data.battery < 20);

    if (isAlarm || isTest) {
      const alarmData = {
        device_id: data.deviceId,
        user_code: deviceOwner.user_code,
        smoke: isAlarm,
        temp: data.temperature ?? data.temp?.tC,
        battery: data.battery_percent ? data.battery_percent > 20 : (data.battery ? data.battery > 20 : null),
        raw_data: data.raw_data || data,
        alarm_type: isTest ? 'test' : 'smoke',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      };

      const { error: alarmError } = await supabase
        .from('alarms')
        .insert(alarmData);

      if (alarmError) {
        console.error('Error creating alarm:', alarmError);
      } else {
        console.log(`${isTest ? 'Test' : 'Smoke'} alarm created for device:`, data.deviceId);
        
        // Skicka olika notifikationer beroende på typ
        if (isTest) {
          await sendPushNotification(supabase, deviceOwner.user_code, {
            title: '✅ Testalarm',
            body: `Brandvarnare ${data.deviceId} fungerar korrekt`,
            data: {
              type: 'test_alarm',
              deviceId: data.deviceId,
              timestamp: new Date().toISOString(),
            }
          });
        } else {
          // Verkligt brandlarm
          await sendPushNotification(supabase, deviceOwner.user_code, {
            title: '🚨 BRANDLARM!',
            body: `RÖK UPPTÄCKT! Enhet: ${data.deviceId}`,
            data: {
              type: 'fire_alarm',
              deviceId: data.deviceId,
              temperature: data.temperature ?? data.temp?.tC,
              timestamp: new Date().toISOString(),
            }
          });
        }
      }
    }

    // Hantera låg batterinivå separat
    if (isBatteryLow && !isAlarm) {
      await sendPushNotification(supabase, deviceOwner.user_code, {
        title: '🔋 Låg batterinivå',
        body: `Brandvarnare ${data.deviceId} behöver batteribyte`,
        data: {
          type: 'battery_low',
          deviceId: data.deviceId,
          battery_level: data.battery_percent ?? data.battery,
          timestamp: new Date().toISOString(),
        }
      });
    }

    console.log('Successfully processed Shelly data for device:', data.deviceId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data processed successfully',
        deviceId: data.deviceId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotification(supabase: any, userCode: string, notification: any) {
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
            title: notification.title,
            body: notification.body,
            image: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png'
          },
          data: notification.data,
          webpush: {
            notification: {
              title: notification.title,
              body: notification.body,
              icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
              badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
              vibrate: [500, 300, 500, 300, 500],
              requireInteraction: true,
              actions: [
                {
                  action: 'view',
                  title: 'Öppna ID-Bevakarna'
                },
                {
                  action: 'call',
                  title: 'Ring 112'
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
          console.log('FCM notification sent successfully to token:', tokenData.fcm_token.slice(0, 10) + '...');
        } else {
          console.error('FCM send failed:', await response.text());
        }
      } catch (error) {
        console.error('Error sending FCM to token:', error);
      }
    }
    
  } catch (error) {
    console.error('Error sending push notification:', error);
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