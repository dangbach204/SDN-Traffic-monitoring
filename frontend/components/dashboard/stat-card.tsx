import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  unit: string
  borderColor: string
}

export default function StatCard({ label, value, unit, borderColor }: StatCardProps) {
  return (
    <Card className={`border-t-4 ${borderColor} rounded-2xl p-6 bg-white shadow-sm`}>
      <p className="text-sm text-gray-600 font-medium mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{unit}</p>
      </div>
    </Card>
  )
}
