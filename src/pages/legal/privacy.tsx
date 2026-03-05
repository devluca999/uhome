/**
 * Privacy Policy Page
 *
 * Required for GDPR/CCPA compliance. Accessible at /privacy.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="container mx-auto px-4 py-12 max-w-3xl relative z-10">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-medium mb-2">1. Overview</h2>
            <p>
              uhome ("we", "our", or "us") respects your privacy. This policy describes how we
              collect, use, and protect your personal information when you use our property
              management platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">2. Information We Collect</h2>
            <p>We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account data: email, role, and authentication credentials</li>
              <li>Property data: property names, addresses, rent amounts</li>
              <li>Tenant data: move-in dates, lease terms, contact information</li>
              <li>Communications: messages sent through the platform</li>
              <li>Financial data: rent records and payment history (when Stripe is enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">3. How We Use Your Information</h2>
            <p>
              We use your information to provide, maintain, and improve our services; to communicate
              with you; and to comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">4. Data Sharing</h2>
            <p>
              We do not sell your personal information. We share data only with service providers
              (Supabase, Stripe, Postal) as necessary to operate the platform, under data processing
              agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access your data (via Settings → Data Export)</li>
              <li>Request deletion (via Settings → Data Deletion)</li>
              <li>Opt out of marketing emails</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">6. Contact</h2>
            <p>
              For privacy requests or questions, contact us at support@uhome.app or through the
              app's Settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
