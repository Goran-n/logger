"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

// Dependencies
var fs = require('fs');

var _ = require('lodash');

var winston = require('winston');

var format = winston.format;

var LogstashTransport = require("./transporter");

var util = require('util');

var os = require('os');
/**
 * A utility class to wrap Winston logging
 * @class Logger
 * @param {object} config - A global configuration object that may contain
 * options on how to initialize the logger
 * @example
 * let logger = new logger({
    urn: 'app-test',
    host: os.hostname(),
    environment: 'development',
      logstash: {
        host: 'localhost',
        mode: 'udp',
        port: 5000,
      },
 * });
 */


var Logger = /*#__PURE__*/function () {
  /**
   * @param {Object} config
   */
  function Logger() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck2["default"])(this, Logger);
    this.config = config;
    var defaultLogging = {
      logDir: './logs',
      options: {},
      verbose: false
    };
    this.loggingConfig = _.assign({}, defaultLogging, config.logging || {});
    this.logDir = this.loggingConfig.logDir || './logs';
    var transports = []; // Optimization -- Add console logging and debug file if not in production
    // eslint-disable-next-line node/no-process-env

    var env = process.env.NODE_ENV;

    if (env !== 'production' && env !== 'test') {
      var lvl = this.loggingConfig.verbose ? 'silly' : 'debug';
      transports.push(new winston.transports.Console({
        level: lvl,
        format: format.printf(this.formatter)
      }));
      transports.push(new winston.transports.File({
        filename: "".concat(this.logDir, "/debug.log"),
        name: 'debug-log',
        level: 'debug',
        format: format.printf(this.formatter)
      }));
    }

    this.options = {
      exitOnError: true,
      transports: transports.slice(0),
      handleExceptions: true,
      humanReadableUnhandledException: true
    }; // Add logstash logging when it has an included configuration

    if (config.logstash) {
      this.options.transports.push(new LogstashTransport({
        port: config.logstash.port,
        host: config.logstash.host,
        meta: {
          urn: this.config ? this.config.urn : null,
          host: os.hostname(),
          // eslint-disable-next-line node/no-process-env
          environment: this.config ? this.config.environment : process.env.NODE_ENV
        },
        format: format.combine(format.printf(this.commonFormatter), format.printf(this.logstashFormatter))
      }));
    } // Create log folder if it does not already exist


    if (!fs.existsSync(this.loggingConfig.logDir)) {
      fs.mkdirSync(this.loggingConfig.logDir);
    }

    this.loggers = new winston.Container();
    this.loggers.add('default', this.options);
    this.log = this.loggers.get('default'); // Mixin to replacement to strip empty logs in debug and error

    this.addBetterLoggingMixins(this.log);
  } // Adds Mixin replacement to strip logs which contain empty string or objects


  (0, _createClass2["default"])(Logger, [{
    key: "addBetterLoggingMixins",
    value: function addBetterLoggingMixins(log) {} // log.oldSilly = log.silly;
    // log.oldInfo = log.info;
    // log.oldDebug = log.debug;
    // log.oldWarn = log.warn;
    // log.oldError = log.error;
    // log.genLog = ((replaceFn, ...params) => {
    //   if (params[0]) {
    //     const data = Object.assign({}, params[0]);
    //
    //     if (typeof params[0] !== 'string') {
    //       if (params[0] instanceof Error) {
    //         params[0] = JSON.stringify(
    //           params[0],
    //           Object.getOwnPropertyNames(params[0]));
    //       } else {
    //         params[0] = JSON.stringify(params[0]);
    //       }
    //     }
    //     if (data !== '{}' && data !== '') {
    //       replaceFn(...params);
    //     }
    //   }
    // });
    // log.silly = ((...params) => {
    //   log.genLog(log.oldSilly, ...params);
    // });
    // log.info = ((...params) => {
    //   log.genLog(log.oldInfo, ...params);
    // });
    // log.debug = ((...params) => {
    //   log.genLog(log.oldDebug, ...params);
    // });
    // log.warn = ((...params) => {
    //   log.genLog(log.oldWarn, ...params);
    // });
    // log.error = ((...params) => {
    //   log.genLog(log.oldError, ...params);
    // });
    // Console and File log formatter

  }, {
    key: "formatter",
    value: function formatter(options) {
      var message = options.message;

      if (!message) {
        message = JSON.parse(options[Symbol["for"]('message')])['@message'];
      }

      return "".concat(new Date().toISOString(), " [").concat(options.level.toUpperCase(), "]: ").concat(message);
    } // Console and File log formatter

  }, {
    key: "commonFormatter",
    value: function commonFormatter(options) {
      var out = {
        'urn': options ? options.urn : null,
        'host': os.hostname(),
        // eslint-disable-next-line node/no-process-env
        'environment': options ? options.environment : process.env.NODE_ENV
      };

      try {
        return JSON.stringify(out);
      } catch (e) {
        return util.inspect(out, {
          depth: null
        });
      }
    } // Logstash formatter

  }, {
    key: "logstashFormatter",
    value: function logstashFormatter(options) {
      var message = options.message;

      if (!message) {
        message = JSON.parse(options[Symbol["for"]('message')])['@message'];
      }

      var out = {
        "@message": message.message ? message.message : undefined,
        "data": message.data ? message.data : undefined,
        "serializer": message.serializer ? message.serializer : undefined,
        "request": message.request ? message.request : undefined,
        't': {
          'id': message.t ? message.t.id : undefined,
          'urn': message.t ? message.t.urn : undefined,
          'time': message.t ? message.t.time : undefined
        },
        'user': options.userId || undefined
      };

      try {
        return JSON.stringify(out);
      } catch (e) {
        return util.inspect(out, {
          depth: null
        });
      }
    }
  }]);
  return Logger;
}();

exports["default"] = Logger;