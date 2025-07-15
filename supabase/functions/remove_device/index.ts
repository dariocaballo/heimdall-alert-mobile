import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

    if (!user_code || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: user_code and device_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Removing device ${device_id} from user ${user_code}`)

    // Verify user code exists
    const { data: userExists, error: userError } = await supabase
      .from('user_codes')
      .select('id')
      .eq('user_code', user_code)
      .single()

    if (userError || !userExists) {
      console.error('User code not found:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid user code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Remove device from user_devices
    const { error: removeError } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_code', user_code)
      .eq('device_id', device_id)

    if (removeError) {
      console.error('Error removing device:', removeError)
      return new Response(
        JSON.stringify({ error: 'Failed to remove device' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Remove device status entries
    const { error: statusError } = await supabase
      .from('device_status')
      .delete()
      .eq('user_code', user_code)
      .eq('device_id', device_id)

    if (statusError) {
      console.error('Error removing device status:', statusError)
      // Continue anyway, this is not critical
    }

    console.log(`Device ${device_id} successfully removed from user ${user_code}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Device removed successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in remove_device function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})