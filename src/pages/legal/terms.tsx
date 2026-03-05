/**
 * Terms of Service Page
 *
 * Required for launch compliance. Accessible at /terms.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ArrowLeft } from 'lucide-react'

export function TermsOfService() {
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
        <h1 className="text-3xl font-semibold mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-medium mb-2">1. Agreement</h2>
            <p>
              By using uhome, you agree to these Terms of Service. If you do not agree, do not use
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">2. Use of Service</h2>
            <p>
              You agree to use uhome only for lawful purposes and in accordance with these terms.
              You are responsible for maintaining the accuracy of property and tenant data you
              provide.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">3. Payments</h2>
            <p>
              When rent collection or subscription billing is enabled, payments are processed by
              Stripe. You agree to Stripe's terms and our payment policies. Refunds and disputes are
              handled per our payment settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">4. Account Termination</h2>
            <p>
              We may suspend or terminate your account for violation of these terms or for any
              reason with notice. You may request account deletion at any time via Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">5. Limitation of Liability</h2>
            <p>
              uhome is provided "as is." We are not liable for indirect, incidental, or
              consequential damages. Our liability is limited to the amount you paid us in the
              twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-2">6. Contact</h2>
            <p>For questions about these terms, contact support@uhome.app.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
