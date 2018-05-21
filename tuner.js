var Tuner = function () {
  window.AudioContext = window.AudioContext || window.webkitAudioContext
  if (!window.AudioContext) {
    return alert('AudioContext not supported')
  }

  this.middleA = 440
  this.semitone = 69
  this.bufferSize = 4096
  this.noteStrings = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  this.audioContext = new window.AudioContext()
  this.analyser = this.audioContext.createAnalyser()
  if(!this.audioContext.createScriptProcessor){
       this.scriptProcessor = this.audioContext.createJavaScriptNode(4096, 2, 2);
  } else {
       this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 2, 2);
  }
  this.pitchDetector = new (Module().AubioPitch)(
    'default', this.bufferSize, 1, this.audioContext.sampleRate)
}

Tuner.prototype.start = function () {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
  if (!navigator.getUserMedia) {
    return alert('getUserMedia not supported')
  }

  var self = this
  console.log('navigator.getUserMedia');
  navigator.getUserMedia({audio: true}, function (stream) {
    self.audioContext.createMediaStreamSource(stream).connect(self.analyser)
    self.analyser.connect(self.scriptProcessor)
    self.scriptProcessor.connect(self.audioContext.destination)
    console.log(self.scriptProcessor);
    self.scriptProcessor.onaudioprocess = function(event) {
      console.log(1)
      // console.log(event)
    }
    self.scriptProcessor.addEventListener('audioprocess', function (event) {
      // console.log(event);
      var data = event.inputBuffer.getChannelData(0)
      // console.log(data);
      var frequency = self.pitchDetector.do(event.inputBuffer.getChannelData(0))
      if (frequency && self.onNoteDetected) {
        var note = self.getNote(frequency)
        self.onNoteDetected({
          name: self.noteStrings[note % 12],
          value: note,
          cents: self.getCents(frequency, note),
          numbered: parseInt(note / 12) - 1,
          frequency: frequency,
        })
      }
    })
  }, function (error) {
    console.log(error);
    alert(error.name + ': ' + error.message)
  })
}

/**
 * get musical note from frequency
 *
 * @param {float} frequency
 * @returns {int}
 */
Tuner.prototype.getNote = function (frequency) {
  console.log(frequency);
  var note = 12 * (Math.log(frequency / this.middleA) / Math.log(2))
  return Math.round(note) + this.semitone
}

/**
 * get the musical note's standard frequency
 *
 * @param note
 * @returns {number}
 */
Tuner.prototype.getStandardFrequency = function (note) {
  return this.middleA * Math.pow(2, (note - this.semitone) / 12)
}

/**
 * get cents difference between given frequency and musical note's standard frequency
 *
 * @param {float} frequency
 * @param {int} note
 * @returns {int}
 */
Tuner.prototype.getCents = function (frequency, note) {
  return Math.floor(1200 * Math.log(frequency / this.getStandardFrequency(note)) / Math.log(2))
}

/**
 * play the musical note
 *
 * @param {float} frequency
 */
Tuner.prototype.play = function (frequency) {
  if (!this.oscillator) {
    this.oscillator = this.audioContext.createOscillator()
    this.oscillator.connect(this.audioContext.destination)
    this.oscillator.start()
  }
  this.oscillator.frequency.value = frequency
}

Tuner.prototype.stop = function () {
  this.oscillator.stop()
  this.oscillator = null
}
