import React from 'react'
import ReactDOM from 'react-dom'
import Ap from './containers/App'
import tore from './redux/store'
import { Prvider } from 'react-redux'

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>
  , document.getElementById('root'))
