import socketIO from 'socket.io-client'
import { reimportModule } from './reload.js'

const backendUrl = '' // same URL
let socket = socketIO(backendUrl)

socket.on('connect', () => {
    // console.log('hot reload connected')
    socket.emit('identification', navigator.userAgent)
    // socket.emit('package.json', function (pjson) {
    //     // console.log('stuff', pjson)
    //     // self.pjson = pjson // maybe needed in the future?
    //     // self.jspmConfigFile = pjson.jspm.configFile || 'config.js'
    // })
})

socket.on('reload', () => {
    console.log('whole page reload requested')
})

socket.on('change', (e) => {
    var path = e.path,
        norm = System.normalizeSync(path)

    if(System.bundles[path]){
        // console.log('BUILT BUNDLE', path)
    }else if(System.has(norm)){
        // console.log('UPDATE MODULE', path)
        reimportModule(norm)
    }else{
        // console.log('NOT FOUND', path)
    }
})

socket.on('disconnect', () => {
    console.log('hot reload disconnected from ', backendUrl)
})

window.onerror = (err) => {
    socket.emit('error', err)  // emitting errors for jspm-dev-buddy
}

