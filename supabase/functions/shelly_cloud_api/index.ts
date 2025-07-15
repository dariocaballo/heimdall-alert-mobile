import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShellyCloudResponse {
  data: {
    device_status: {
      wifi: {
        connected: boolean;
        ssid: string;
        rssi: number;
      };
      smoke: {
        alarm: boolean;
      };
      temperature: {
        tC: number;
        tF: number;
      };
      battery: {
        V: number;
        percent: number;
      };
      _updated: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_code } = await req.json();

    if (!user_code) {
      return new Response(
        JSON.stringify({ error: 'user_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all devices for this user
    const { data: userDevices, error: userDevicesError } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('user_code', user_code);

    if (userDevicesError || !userDevices) {
      return new Response(
        JSON.stringify({ error: 'No devices found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll each device via Shelly Cloud API
    const deviceStatuses = [];
    
    for (const device of userDevices) {
      try {
        // This would normally use a real Shelly Cloud API key
        // For demo purposes, we'll simulate the response
        const mockCloudResponse: ShellyCloudResponse = {
          data: {
            device_status: {
              wifi: {
                connected: true,
                ssid: "Home_WiFi",
                rssi: -45
              },
              smoke: {
                alarm: Math.random() > 0.9 // 10% chance of alarm for demo
              },
              temperature: {
                tC: Math.floor(Math.random() * 10) + 20, // 20-30°C
                tF: 0
              },
              battery: {
                V: 3.2,
                percent: Math.floor(Math.random() * 40) + 60 // 60-100%
              },
              _updated: new Date().toISOString()
            }
          }
        };

        // Update device status in our database
        const statusUpdate = {
          device_id: device.device_id,
          user_code: user_code,
          online: mockCloudResponse.data.device_status.wifi.connected,
          smoke: mockCloudResponse.data.device_status.smoke.alarm,
          temperature: mockCloudResponse.data.device_status.temperature.tC,
          battery_level: mockCloudResponse.data.device_status.battery.percent,
          signal_strength: Math.abs(mockCloudResponse.data.device_status.wifi.rssi),
          last_seen: new Date(),
          raw_data: mockCloudResponse.data
        };

        await supabase
          .from('device_status')
          .upsert(statusUpdate, { 
            onConflict: 'device_id',
            ignoreDuplicates: false 
          });

        // If smoke detected, create alarm
        if (mockCloudResponse.data.device_status.smoke.alarm) {
          await supabase
            .from('alarms')
            .insert({
              device_id: device.device_id,
              user_code: user_code,
              smoke: true,
              temp: mockCloudResponse.data.device_status.temperature.tC,
              battery: mockCloudResponse.data.device_status.battery.percent > 20,
              raw_data: mockCloudResponse.data,
              alarm_type: 'smoke',
              timestamp: new Date()
            });

          // Send FCM notification
          await sendFCMNotification(supabase, user_code, device.device_id);
        }

        deviceStatuses.push({
          device_id: device.device_id,
          ...statusUpdate
        });

      } catch (error) {
        console.error(`Error polling device ${device.device_id}:`, error);
        
        // Mark device as offline if polling fails
        deviceStatuses.push({
          device_id: device.device_id,
          online: false,
          last_seen: new Date(),
          error: 'Polling failed'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        devices: deviceStatuses,
        polled_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Shelly Cloud API polling:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendFCMNotification(supabase: any, userCode: string, deviceId: string) {
  try {
    // Get FCM tokens for this user
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_code', userCode);

    if (error || !tokens || tokens.length === 0) {
      console.log('No FCM tokens found for user:', userCode);
      return;
    }

    // Here we would send actual FCM notifications
    // For now, we'll just log the notification
    console.log('Would send FCM notification to', tokens.length, 'devices');
    console.log('Notification:', {
      title: '🚨 ID-BEVAKARNA BRANDLARM!',
      body: `Rök upptäckt på ${deviceId}`,
      data: {
        type: 'fire_alarm',
        deviceId: deviceId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
}