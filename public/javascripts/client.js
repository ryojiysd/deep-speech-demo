const socket = io.connect()
let processor = null
let localstream = null

function startRecording() {
    console.log('start recording')
    context = new window.AudioContext({ sampleRate: 16000 })
    socket.emit('start', { 'sampleRate': context.sampleRate })

    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        localstream = stream
        const input = this.context.createMediaStreamSource(stream)
        processor = context.createScriptProcessor(4096, 1, 1)

        input.connect(processor)
        processor.connect(context.destination)

        processor.onaudioprocess = (e) => {
            const voice = e.inputBuffer.getChannelData(0)
            socket.emit('send_pcm', voice.buffer, (res) => {
                console.log(`text: ${res.text}`)
                document.getElementById('transcript').innerText = res.text
            })
        }
    }).catch((e) => {
        // "DOMException: Rrequested device not found" will be caught if no mic is available
        console.log(e)
    })
}

async function stopRecording() {
    console.log('stop recording')
    processor.disconnect()
    processor.onaudioprocess = null
    processor = null
    localstream.getTracks().forEach(track => track.stop())

    socket.emit('stop', '', (res) => {
        console.log(`text: ${res.text}`)
        document.getElementById('transcript').innerText = res.text
    })
    console.log('stop recording end')
}
