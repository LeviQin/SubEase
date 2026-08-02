function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function createEmptyFormState() {
  return {
    id: null,
    name: '',
    price: '',
    currency: 'CNY',
    cycle: '月付',
    category: '',
    nextDate: todayString(),
    remindDays: 3,
    method: '',
    autoRenew: true,
    notes: ''
  }
}

export function createInitialState() {
  return {
    activeTab: 'home',
    subscriptions: [],
    filterCategory: '',
    sortOrder: 'date',
    searchKeyword: '',
    selectedIds: [],
    amountsHidden: false,
    sheetState: {
      visible: false,
      type: '',
      payload: null
    },
    toastState: {
      visible: false,
      message: ''
    },
    formState: createEmptyFormState()
  }
}
