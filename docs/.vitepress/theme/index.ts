import DefaultTheme from 'vitepress/theme'
import HomePage from '../components/HomePage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  components: {
    HomePage
  }
}
