const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const WavEncoder = require('wav-encoder')
const fs = require('fs')
const ds = require('deepspeech')
const app = express()

const modelfile = 'bin/output_graph.pbmm'
const lm = 'bin/lm.binary'
const trie = 'bin/trie'
const beamWidth = 500
const lmAlpha = 0.75
const lmBeta = 1.85

const model = new ds.Model(modelfile, beamWidth)
if (model === undefined) {
    console.log('model is undefined!!!')
}
console.log(model.sampleRate())
let ret = model.enableDecoderWithLM(lm, trie, lmAlpha, lmBeta)
if (ret !== 0) {
    console.log('Failed in enabling Language Model')
}

// ds.FreeModel(model)

app.use('/', express.static(path.join(__dirname, 'public')))

server = http.createServer(app).listen(3000, function() {
    console.log('Example app listening on port 3000')
})

const io = socketio.listen(server)

io.on('connection', (socket) => {
    let ctx
    let count = 0

    socket.on('start', (data) => {
        if (model.sampleRate() != data.sampleRate) {
            console.log(`Sample Rate mismatch`)
        }
        ctx = model.createStream()
    })

    socket.on('send_pcm', (data, ack) => {
        count += 1
        // data: { "1": 11, "2": 29, "3": 33, ... }
        const itr = data.values()
        const buf = new Array(data.length)
        for (var i = 0; i < buf.length; i++) {
            buf[i] = itr.next().value
        }

        pcm = toInt16Array(buf)
        for (var i = 0; i < pcm.length; i++) {
            process.stdout.write(pcm[i])
            // process.stdout.write(' ')
            // console.log(pcm[i])
        }
        process.stdout.write("\n")
        model.feedAudioContent(ctx, pcm)
        let transcript = ""
        if (count % 10 == 0) {
            let transcript = model.intermediateDecode(ctx)
            console.log(`text: ${transcript}`)
        }
        ack({ text: transcript })
    })

    socket.on('stop', (data, ack) => {
        console.log('finish')
        let transcript = model.finishStream(ctx)
        console.log(`Finish: ${transcript}`)
        // ds.FreeStream(ctx)
        ack({ text: transcript })
        console.log('finish end')
    })
})

// Convert byte array to Float32Array
const toInt16Array = (buf) => {
    const buffer = new ArrayBuffer(buf.length)
    const view = new Uint8Array(buffer)
    for (var i = 0; i < buf.length; i++) {
        view[i] = buf[i]
    }
    return new Int16Array(buffer)
}
