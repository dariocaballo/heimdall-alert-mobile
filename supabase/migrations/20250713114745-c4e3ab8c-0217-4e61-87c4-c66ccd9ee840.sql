-- Add sample device status data for testing
INSERT INTO device_status (device_id, user_code, online, smoke, temperature, battery_level, signal_strength) VALUES 
  ('shelly-smoke-demo-01', 'DEMO01', true, false, 22.5, 85, -55),
  ('shelly-smoke-demo-02', 'DEMO01', true, false, 23.1, 78, -62),
  ('shelly-smoke-demo-03', 'DEMO01', false, false, 21.8, 45, -89),
  ('shelly-smoke-test-01', 'TEST01', true, false, 24.2, 92, -48),
  ('shelly-smoke-test-02', 'TEST01', true, false, 22.9, 88, -51),
  ('shelly-smoke-abc-01', 'ABC123', true, false, 23.5, 91, -46),
  ('shelly-smoke-xyz-01', 'XYZ789', true, true, 28.7, 76, -58);

-- Add sample alarm history for testing (using correct column name 'temp')
INSERT INTO alarms (device_id, user_code, smoke, temp, battery, alarm_type, location) VALUES 
  ('shelly-smoke-demo-01', 'DEMO01', true, 45.2, true, 'smoke', 'Kök'),
  ('shelly-smoke-demo-02', 'DEMO01', true, 42.8, true, 'smoke', 'Vardagsrum'),
  ('shelly-smoke-test-01', 'TEST01', false, 22.1, true, 'battery_low', 'Sovrum'),
  ('shelly-smoke-xyz-01', 'XYZ789', true, 38.5, true, 'smoke', 'Hall'),
  ('shelly-smoke-abc-01', 'ABC123', false, 21.9, false, 'battery_low', 'Badrum');