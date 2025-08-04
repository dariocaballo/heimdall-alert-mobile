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

    const { deviceId, userCode, smoke = true, temperature = 25, battery = 85 } = await req.json();

    if (!deviceId || !userCode) {
      return new Response(
        JSON.stringify({ error: 'deviceId and userCode are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating test alarm for device:', deviceId);

    // Skapa testalarm i databasen
    const alarmData = {
      device_id: deviceId,
      user_code: userCode,
      smoke: smoke,
      temp: temperature,
      battery: battery > 20,
      raw_data: {
        test: true,
        deviceId,
        smoke,
        temperature,
        battery,
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
        JSON.stringify({ error: 'Failed to create test alarm' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Uppdatera device status
    const statusUpdate = {
      device_id: deviceId,
      user_code: userCode,
      online: true,
      smoke: smoke,
      temperature: temperature,
      battery_level: battery,
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
    await sendTestNotification(supabase, userCode, deviceId);

    console.log('Test alarm created successfully for device:', deviceId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test alarm created successfully',
        deviceId: deviceId,
        userCode: userCode,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing test alarm:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
    
    if (!firebaseServerKey) {
      console.log('Firebase server key not configured');
      return;
    }

    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    
    for (const tokenData of tokens) {
      const fcmPayload = {
        to: tokenData.fcm_token,
        notification: {
          title: '✅ Testalarm',
          body: `Brandvarnare ${deviceId} fungerar korrekt`,
          icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
          badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
          click_action: '/',
          sound: 'default'
        },
        data: {
          type: 'test_alarm',
          deviceId: deviceId,
          timestamp: new Date().toISOString(),
        },
        priority: 'high',
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
        }
      };

      try {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `key=${firebaseServerKey}`,
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