export interface SearchableItem {
  id: string
  name: string
  isNew?: boolean
  icon?: string // Optional, for categories
}

export interface SearchState {
  query: string
  items: SearchableItem[]
  selectedItem: SearchableItem | null
  showDropdown: boolean
  isLoading: boolean
}