-- Add more test codes and devices for testing
INSERT INTO user_codes (user_code) VALUES 
  ('TEST01'),
  ('TEST02'),
  ('ABC123'),
  ('XYZ789'),
  ('DEMO01')
ON CONFLICT (user_code) DO NOTHING;

-- Add corresponding devices for the test codes
INSERT INTO user_devices (user_code, device_id) VALUES 
  ('QUUCU8', 'shelly-smoke-001'),
  ('QUUCU8', 'shelly-smoke-002'),
  ('P9BAL5', 'shelly-smoke-003'),
  ('TEST01', 'shelly-smoke-test-01'),
  ('TEST01', 'shelly-smoke-test-02'),
  ('TEST02', 'shelly-smoke-test-03'),
  ('ABC123', 'shelly-smoke-abc-01'),
  ('XYZ789', 'shelly-smoke-xyz-01'),
  ('DEMO01', 'shelly-smoke-demo-01'),
  ('DEMO01', 'shelly-smoke-demo-02'),
  ('DEMO01', 'shelly-smoke-demo-03'),
  ('ELSA84', 'shelly-smoke-12345'),
  ('GUNNAR99', 'shelly-smoke-12346')
ON CONFLICT DO NOTHING;