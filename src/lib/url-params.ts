import { useSearchParams } from 'react-router-dom'

/**
 * Utility functions for managing URL parameters for filtering
 */

export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const getFilterParam = (key: string): string | null => {
    return searchParams.get(key)
  }

  const setFilterParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams, { replace: true })
  }

  const clearFilterParam = (key: string) => {
    setFilterParam(key, null)
  }

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true })
  }

  return {
    getFilterParam,
    setFilterParam,
    clearFilterParam,
    clearAllFilters,
    searchParams,
  }
}
