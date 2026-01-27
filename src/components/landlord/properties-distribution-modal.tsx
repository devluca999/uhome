import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useLandlordRentRecords } from '@/hooks/use-landlord-rent-records'
import { useExpenses } from '@/hooks/use-expenses'
// Button removed - not used

interface PropertiesDistributionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PropertiesDistributionModal({ isOpen, onClose }: PropertiesDistributionModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { records: rentRecords } = useLandlordRentRecords()
  const { expenses } = useExpenses()

  const sections = useMemo((): BreakdownSection[] => {
    return properties.map(property => {
      // Calculate income per property (rent collected)
      const propertyIncome = rentRecords
        .filter(r => r.property_id === property.id && r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      // Calculate expenses per property
      const propertyExpenses = expenses
        .filter(e => e.property_id === property.id)
        .reduce((sum, e) => sum + Number(e.amount), 0)

      // Calculate net margin
      const netMargin = propertyIncome - propertyExpenses
      const marginPercentage = propertyIncome > 0 ? (netMargin / propertyIncome) * 100 : 0

      return {
        label: property.name,
        value: netMargin,
        percentage: marginPercentage,
        color: netMargin >= 0 ? 'green' : 'red',
        breakdown: [
          { label: 'Income', value: propertyIncome },
          { label: 'Expenses', value: propertyExpenses },
        ],
      }
    })
  }, [properties, rentRecords, expenses])

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Properties Distribution"
      description="Income, expenses, and net margin per property"
      sections={sections}
      cta={{
        label: 'View all properties',
        action: () => {
          onClose()
          navigate('/landlord/properties')
        },
      }}
    />
  )
}
