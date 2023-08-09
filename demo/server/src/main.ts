import 'vite/modulepreload-polyfill'
import './main.scss'

// (async () => {
//   const oldWrapper = document.getElementById('vite-plugin-svg-spritemap')
//   if (oldWrapper)
//     oldWrapper.remove()

//   const wrapper = document.createElement('div')
//   try {
//     const res = await fetch('http://localhost:5173/__spritemap')
//     const text = await res.text()
//     wrapper.innerHTML = text
//     wrapper.id = 'vite-plugin-svg-spritemap'
//     wrapper.style.display = 'none'
//     document.body.append(wrapper)
//   }
//   catch (error) {
//     console.error(error)
//   }
// })()
