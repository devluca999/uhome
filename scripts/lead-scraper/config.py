"""
Scraper Configuration
"""

import os

# Rate Limits
RATE_LIMIT_REQUESTS_PER_MIN = int(os.getenv('SCRAPER_RATE_LIMIT', '10'))
RATE_LIMIT_REQUESTS_PER_HOUR = int(os.getenv('SCRAPER_RATE_LIMIT_HOUR', '100'))

# Kill Switch
KILL_SWITCH_CHECK_INTERVAL = int(os.getenv('KILL_SWITCH_CHECK_INTERVAL', '60'))  # seconds

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Edge Function Endpoint
INGEST_LEADS_ENDPOINT = os.getenv('INGEST_LEADS_ENDPOINT', 'ingest-leads')

# Scraper Settings
HEADLESS = os.getenv('SCRAPER_HEADLESS', 'true').lower() == 'true'
TIMEOUT = int(os.getenv('SCRAPER_TIMEOUT', '30000'))  # milliseconds
