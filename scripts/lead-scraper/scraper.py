#!/usr/bin/env python3
"""
Lead Scraper (Python + Playwright)
Phase 6: Ethical + Controlled Lead Scraper

This scraper is designed for defined ICP targets only.
Features:
- Kill switch support (checks database before each run)
- Rate limiting (max 10 requests/min, configurable)
- Auto-enrolls leads with clear opt-out
- Delivery verification
- Source tagging (scraper vs organic)
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, Page
from supabase import create_client, Client

# Configuration
RATE_LIMIT_REQUESTS_PER_MIN = 10
KILL_SWITCH_CHECK_INTERVAL = 60  # Check every 60 seconds
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Service role for kill switch check

# ICP Targets (defined in targets.json)
ICP_TARGETS_FILE = 'scripts/lead-scraper/targets.json'


class LeadScraper:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.kill_switch_active = False
        self.leads_found: List[Dict] = []

    async def initialize(self):
        """Initialize Supabase client and check kill switch"""
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            await self.check_kill_switch()

    async def check_kill_switch(self) -> bool:
        """Check if scraper kill switch is active"""
        if not self.supabase:
            return False

        try:
            response = self.supabase.table('scraper_kill_switch').select('enabled').execute()
            if response.data:
                self.kill_switch_active = response.data[0].get('enabled', False)
                return self.kill_switch_active
        except Exception as e:
            print(f"Error checking kill switch: {e}")
            # Fail safe: assume kill switch is on
            self.kill_switch_active = True
            return True

        return False

    async def scrape_target(self, target: Dict, page: Page) -> List[Dict]:
        """Scrape a single ICP target"""
        leads = []

        try:
            # Navigate to target URL
            await page.goto(target['url'], wait_until='networkidle')
            await asyncio.sleep(1)  # Rate limiting

            # Extract leads based on target configuration
            # This is a placeholder - actual scraping logic depends on target structure
            # Example: Extract email addresses from page
            email_elements = await page.query_selector_all(target.get('email_selector', 'a[href^="mailto:"]'))
            
            for element in email_elements:
                email = await element.get_attribute('href')
                if email and email.startswith('mailto:'):
                    email = email.replace('mailto:', '').strip()
                    if email:
                        leads.append({
                            'email': email,
                            'name': target.get('name', ''),
                            'source': 'scraper',
                            'scraped_at': datetime.now().isoformat(),
                            'source_url': target['url'],
                        })

        except Exception as e:
            print(f"Error scraping target {target.get('url', 'unknown')}: {e}")

        return leads

    async def run(self):
        """Main scraper execution"""
        print("Starting lead scraper...")

        # Check kill switch before starting
        if await self.check_kill_switch():
            print("❌ Scraper kill switch is active. Aborting.")
            return

        # Load ICP targets
        try:
            with open(ICP_TARGETS_FILE, 'r') as f:
                targets = json.load(f)
        except FileNotFoundError:
            print(f"❌ Targets file not found: {ICP_TARGETS_FILE}")
            return
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in targets file: {e}")
            return

        if not targets:
            print("❌ No targets defined")
            return

        # Record scraper run start
        run_id = None
        if self.supabase:
            try:
                response = self.supabase.table('scraper_runs').insert({
                    'started_at': datetime.now().isoformat(),
                    'status': 'running',
                    'leads_found': 0,
                }).execute()
                if response.data:
                    run_id = response.data[0]['id']
            except Exception as e:
                print(f"Warning: Could not record scraper run: {e}")

        # Initialize Playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                # Scrape each target
                for i, target in enumerate(targets):
                    # Check kill switch periodically
                    if i % 10 == 0:
                        if await self.check_kill_switch():
                            print("❌ Kill switch activated during run. Stopping.")
                            break

                    # Rate limiting
                    if i > 0:
                        await asyncio.sleep(60 / RATE_LIMIT_REQUESTS_PER_MIN)

                    print(f"Scraping target {i + 1}/{len(targets)}: {target.get('url', 'unknown')}")
                    leads = await self.scrape_target(target, page)
                    self.leads_found.extend(leads)

            finally:
                await browser.close()

        # Import leads via Edge Function
        if self.leads_found and self.supabase:
            await self.import_leads()

        # Update scraper run
        if run_id and self.supabase:
            try:
                self.supabase.table('scraper_runs').update({
                    'ended_at': datetime.now().isoformat(),
                    'status': 'completed',
                    'leads_found': len(self.leads_found),
                }).eq('id', run_id).execute()
            except Exception as e:
                print(f"Warning: Could not update scraper run: {e}")

        print(f"✅ Scraper completed. Found {len(self.leads_found)} leads.")

    async def import_leads(self):
        """Import leads via Supabase Edge Function"""
        if not self.supabase:
            return

        try:
            # Call ingest-leads Edge Function
            # Note: This requires the Edge Function to be deployed
            response = self.supabase.functions.invoke('ingest-leads', {
                'body': {
                    'leads': self.leads_found,
                    'source': 'scraper',
                    'actorId': 'system',  # System user ID
                    'environment': 'production',
                    'sandboxMode': False,
                },
            })

            if response.get('error'):
                print(f"❌ Error importing leads: {response['error']}")
            else:
                print(f"✅ Imported {response.get('imported', 0)} leads")
        except Exception as e:
            print(f"❌ Error calling ingest-leads function: {e}")


async def main():
    scraper = LeadScraper()
    await scraper.initialize()
    await scraper.run()


if __name__ == '__main__':
    asyncio.run(main())
