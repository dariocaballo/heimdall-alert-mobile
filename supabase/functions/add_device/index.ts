import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_code, device_id } = await req.json()
    
    console.log('Adding device:', device_id, 'to user code:', user_code)

    if (!user_code || !device_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Både användarens kod och enhets-ID krävs' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Verify user code exists
    const { data: codeData, error: codeError } = await supabase
      .from('user_codes')
      .select('user_code')
      .eq('user_code', user_code.toUpperCase())
      .single()

    if (codeError || !codeData) {
      console.log('Invalid user code:', user_code)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ogiltig användarens kod' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Check if device is already registered to another user
    const { data: existingDevice, error: existingError } = await supabase
      .from('user_devices')
      .select('user_code')
      .eq('device_id', device_id)
      .single()

    if (existingDevice && existingDevice.user_code !== user_code.toUpperCase()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Enheten är redan registrerad till en annan användare' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 
        }
      )
    }

    // Add device to user_devices table (or update if exists)
    const { data, error } = await supabase
      .from('user_devices')
      .upsert({
        user_code: user_code.toUpperCase(),
        device_id: device_id
      })
      .select()

    if (error) {
      console.error('Error adding device:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fel vid tillägg av enhet' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Device added successfully:', device_id, 'to user:', user_code)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhet tillagd framgångsrikt' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in add_device:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Serverfel' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})