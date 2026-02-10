import { ref } from 'vue'
import type { Measurement } from '../types/producto'

const measurements = ref<Measurement[]>([
  { id: 'mea1', type: 'Kg' },
  { id: 'mea2', type: 'g' },
  { id: 'mea3', type: 'L' },
  { id: 'mea4', type: 'ml' },
])

export function useMeasurements() {
  const getMeasurementType = (id: string): string => {
    const measurement = measurements.value.find((m) => m.id === id)
    return measurement ? measurement.type : ''
  }

  return {
    measurements,
    getMeasurementType,
  }
}
