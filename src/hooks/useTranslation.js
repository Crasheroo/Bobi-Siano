import { useMemo } from 'react'
import useStore from '../store/useStore.js'
import { translations } from '../utils/translations.js'

export function useTranslation() {
  const language = useStore((s) => s.settings?.language || 'pl')
  return useMemo(() => translations[language] || translations.pl, [language])
}
