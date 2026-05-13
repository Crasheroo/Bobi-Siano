import { useMemo } from 'react'
import useStore from '../store/useStore.js'
import { CURRENCIES, formatCurrency } from '../utils/constants.js'

export function useFormatCurrency() {
  const currency = useStore((s) => s.settings?.currency || 'PLN')
  return useMemo(() => {
    const curr = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]
    return (amount) => formatCurrency(amount, curr.code, curr.locale)
  }, [currency])
}
