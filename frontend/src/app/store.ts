import { configureStore } from '@reduxjs/toolkit'
import reducer from './appState'

export default configureStore({ reducer })