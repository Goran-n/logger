"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

var _ = require('lodash');

var Transport = require('winston-transport');

var os = require('os');

var dgram = require('dgram');

var tls = require('tls');

var net = require('net');

var fs = require('fs');

var LogstashTransport = /*#__PURE__*/function (_Transport) {
  (0, _inherits2["default"])(LogstashTransport, _Transport);

  var _super = _createSuper(LogstashTransport);

  function LogstashTransport(options) {
    var _this;

    (0, _classCallCheck2["default"])(this, LogstashTransport);
    var defaults = {
      mode: 'udp4',
      localhost: os.hostname(),
      host: '127.0.0.1',
      port: 28777,
      applicationName: process.title,
      pid: process.pid,
      silent: false,
      meta: {},
      maxConnectRetries: 4,
      timeoutConnectRetries: 100,
      sslEnable: false,
      sslKey: '',
      sslCert: '',
      sslCA: '',
      sslPassPhrase: '',
      rejectUnauthorized: false,
      label: process.title,
      trailingLineFeed: false,
      trailingLineFeedChar: os.EOL,
      level: 'info'
    };
    options = options || {};
    options.applicationName = options.applicationName || options.appName || process.title;
    options = _.merge(defaults, options);
    _this = _super.call(this, options);
    _this.silent = options.silent; // Assign all options to local properties

    _.forEach(options, function (value, key) {
      _this[key] = value;
    });

    _this.name = 'logstashTransport';

    if (_this.mode === 'tcp') {
      _this.mode = 'tcp4';
    }

    if (_this.mode === 'udp') {
      _this.mode = 'udp4';
    }

    if (_this.mode.substr(3, 4) === '6' && _this.host === '127.0.0.1') {
      _this.host = '::0';
    } // Connection state


    _this.logQueue = [];
    _this.connectionState = 'NOT CONNECTED';
    _this.socketmode = null;
    _this.socket = null;
    _this.retries = -1;

    _this.connect();

    return _this;
  }

  (0, _createClass2["default"])(LogstashTransport, [{
    key: "log",
    value: function log(info, _callback) {
      var _this2 = this;

      if (this.silent) {
        _callback(null, true);

        return;
      }

      if (info.message) {
        if ((0, _typeof2["default"])(info.message) !== 'object') {
          var strData = info.message;
          info.message = {
            data: strData
          };
        }

        var output = _objectSpread(_objectSpread({
          '@timestamp': new Date().toISOString(),
          '@version': 1,
          'level': info.level
        }, JSON.parse(info[Symbol["for"]('message')])), this.meta);

        if (this.connectionState !== 'CONNECTED') {
          this.logQueue.push({
            message: output,
            callback: function callback() {
              _this2.emit('logged', info);

              _callback(); // callback(err, !err);

            }
          });
        } else {
          setImmediate(function () {
            try {
              _this2.deliver(output, function () {
                _this2.emit('logged', info);

                _callback(); // callback(err, !err);

              });
            } catch (err) {
              _callback();
            }
          });
        }
      }
    }
  }, {
    key: "deliverTCP",
    value: function deliverTCP(message, callback) {
      callback = callback || function () {};

      this.socket.write(message, undefined, callback);
    }
  }, {
    key: "deliverUDP",
    value: function deliverUDP(message, callback) {
      callback = callback || function () {};

      var buff = Buffer.from(message);
      this.socket.send(buff, 0, buff.length, this.port, this.host, callback);
    }
  }, {
    key: "deliver",
    value: function deliver(message, callback) {
      var output = JSON.stringify(message);

      if (this.trailingLineFeed) {
        output = output.replace(/\s+$/, '') + this.trailingLineFeedChar;
      }

      switch (this.socketmode) {
        case 'tcp6':
        case 'tcp4':
          {
            this.deliverTCP(output, callback);
            break;
          }

        case 'udp6':
        case 'udp4':
        default:
          {
            this.deliverUDP(output, callback);
            break;
          }
      }
    }
  }, {
    key: "connectTCP",
    value: function connectTCP() {
      var _this3 = this;

      var options = {
        host: this.host,
        port: this.port
      };

      if (this.sslEnable) {
        options.key = this.sslKey ? fs.readFileSync(this.sslKey) : null;
        options.cert = this.sslCert ? fs.readFileSync(this.sslCert) : null;
        options.passphrase = this.sslPassPhrase || null;
        options.rejectUnauthorized = this.rejectUnauthorized === true;

        if (this.ca) {
          options.ca = [];

          _.forEach(this.ca, function (value) {
            options.ca.push(fs.readFileSync(value));
          });
        }

        this.socket = tls.connect(options, function () {
          _this3.socket.setEncoding('UTF-8');

          _this3.announce();

          _this3.connectionState = 'CONNECTED';
        });
      } else {
        this.socket = new net.Socket();
        this.socket.connect(options, function () {
          _this3.socket.setKeepAlive(true, 60 * 1000);

          _this3.announce();

          _this3.connectionState = 'CONNECTED';
        });
      }

      this.hookTCPSocketEvents();
    }
  }, {
    key: "hookTCPSocketEvents",
    value: function hookTCPSocketEvents() {
      var _this4 = this;

      this.socket.on('error', function () {
        _this4.connectionState = 'NOT CONNECTED';

        if (_this4.socket && typeof _this4.socket !== 'undefined') {
          _this4.socket.destroy();
        }

        _this4.socket = null;

        _this4.emit('close'); // if (!(/ECONNREFUSED/).test(err.message) && !(/socket has been ended/).test(err.message)) {
        //   this.emit('close');
        //   console.log(err);
        //   // setImmediate(() => {
        //   //   this.emit('error', err);
        //   // });
        // } else {
        //   this.emit('close');
        // }

      });
      this.socket.on('timeout', function () {
        if (_this4.socket.readyState !== 'open') {
          _this4.socket.destroy();
        }
      });
      this.socket.on('connect', function () {
        _this4.connectionState = 'CONNECTED';
        _this4.retries = 0;
      });
      this.socket.on('close', function () {
        if (_this4.connectionState === 'TERMINATING') {
          return;
        }

        if (_this4.maxConnectRetries >= 0 && _this4.retries >= _this4.maxConnectRetries) {
          _this4.logQueue = [];
          _this4.silent = true;
          console.error('Max retries reached, placing transport in OFFLINE/silent mode.'); // setImmediate(() => {
          //   this.emit('error', new Error('Max retries reached, placing transport in OFFLINE/silent mode.'));
          // });
        } else if (_this4.connectionState !== 'CONNECTING') {
          setTimeout(function () {
            _this4.connect();
          }, _this4.timeoutConnectRetries);
        }
      });
    }
  }, {
    key: "connectUDP",
    value: function connectUDP() {
      var _this5 = this;

      this.socket = dgram.createSocket(this.mode, {
        sendBufferSize: 60000
      });
      this.socket.on('error', function (err) {
        // Do nothing
        if (!/ECONNREFUSED/.test(err.message)) {
          console.error(err); // setImmediate(() => {
          //   this.emit('error', err);
          // });
        }
      });
      this.socket.on('close', function () {
        _this5.connectionState = 'NOT CONNECTED';
      });

      if (this.socket.unref) {
        this.socket.unref();
      }

      this.announce();
    }
  }, {
    key: "connect",
    value: function connect() {
      if (this.connectionState !== 'CONNECTED') {
        this.socketmode = this.mode;
        this.connectionState = 'CONNECTING';

        switch (this.mode) {
          case 'tcp6':
          case 'tcp4':
            {
              this.connectTCP();
              break;
            }

          case 'udp6':
          case 'udp4':
          default:
            {
              this.connectUDP();
              break;
            }
        }
      }
    }
  }, {
    key: "closeTCP",
    value: function closeTCP() {
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
      this.connectionState = 'NOT CONNECTED';
    }
  }, {
    key: "closeUDP",
    value: function closeUDP() {
      this.socket.close();
      this.connectionState = 'NOT CONNECTED';
    }
  }, {
    key: "close",
    value: function close() {
      if (this.connectionState === 'CONNECTED' && this.socket) {
        this.connectionState = 'TERMINATING';

        switch (this.socketmode) {
          case 'tcp6':
          case 'tcp4':
            {
              this.closeTCP();
              break;
            }

          case 'udp6':
          case 'udp4':
          default:
            {
              this.closeUDP();
              break;
            }
        }

        this.socketmode = null;
      }
    }
  }, {
    key: "flush",
    value: function flush() {
      while (this.logQueue.length > 0) {
        var elem = this.logQueue.shift();
        this.deliver(elem.message, elem.callback);
      }
    }
  }, {
    key: "announce",
    value: function announce() {
      this.flush();

      if (this.connectionState === 'TERMINATING') {
        this.close();
      } else {
        this.connectionState = 'CONNECTED';
      }
    }
  }, {
    key: "getQueueLength",
    value: function getQueueLength() {
      return this.logQueue.length;
    }
  }]);
  return LogstashTransport;
}(Transport);

module.exports = LogstashTransport;