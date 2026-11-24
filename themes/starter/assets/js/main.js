import Alpine from 'alpinejs'
import collapse from '@alpinejs/collapse'
import { themeStore } from './stores/theme.js'
import { searchComponent } from './search.js'

Alpine.plugin(collapse)
Alpine.store('theme', themeStore())
Alpine.data('search', () => searchComponent())

window.Alpine = Alpine
Alpine.start()
