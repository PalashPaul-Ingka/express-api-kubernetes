const { Transform } = require('stream');

class ToJsonTransform extends Transform {
    constructor(options) {
        super(options);
        this._count = 0;
    }
    pushOpening() {
        this.push('{\'data\': [');
    }
    pushClosing() {
        this.push(']}');
    }
    _transform(chunk, encoding, callback) {
        // Convert the Buffer chunks to String.
        if (!this._count) {
            this.pushOpening();
        } 
        this.push(chunk);
        
        this._count++;
        callback(null);
    }

    _flush(done) {
        if (this._count > 0) {
          this.pushClosing();
        }
        done(null);
      }
}

module.exports = ToJsonTransform;