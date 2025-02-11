/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var stringLiteralParser = require('../../combinators').stringLiteralParser;

/**
 * Creates a parser for a String variable
 * @param {object} variable the variable ast node
 * @returns {object} the parser
 */
function stringParser() {
  return stringLiteralParser().map(function (x) {
    return x.substring(1, x.length - 1);
  });
}
module.exports = format => r => stringParser();