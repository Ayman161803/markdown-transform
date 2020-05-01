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

const { ModelManager, Factory, Serializer, ParseException } = require('@accordproject/concerto-core');
const { CommonMarkModel } = require('@accordproject/markdown-common').CommonMarkModel;
const { NS_PREFIX_CiceroMarkTemplateModel, CiceroMarkTemplateModel } = require('./externalModels/CiceroMarkTemplateModel.js');

const parserOfTemplate = require('../lib/FromTemplate').parserOfTemplate;

/**
 * Prepare the text for parsing (normalizes new lines, etc)
 * @param {string} input - the text for the clause
 * @return {string} - the normalized text for the clause
 */
function normalizeText(input) {
    // we replace all \r and \n with \n
    let text =  input.replace(/\r/gm,'');
    return text;
}

/**
 * Minimum length of expected token
 * @param {object} expected the expected token
 * @return {number} the minimum length
 */
function maxOfExpected(expected) {
    return Math.max.apply(null,expected.map((x) => {
        let length = x.length;
        if (/'[^']*'/.test(x)) { length = length-2; } // To account for parsimmon string tokens
        return length;
    }));
}

/**
 * Throw a parse exception
 * @param {string} markdown a markdown string
 * @param {object} result the parsing failure
 * @param {string} [fileName] - the fileName for the markdown (optional)
 */
function _throwParseError(markdown,result,fileName) {
    // File location
    const fileLocation = {};
    const start = result.index;
    const end = {...start};
    end.offset = end.offset+1;
    end.column = end.column+1;
    fileLocation.start = start;
    fileLocation.end = end;

    // Short message
    const shortMessage = `Parse error at line ${result.index.line} column ${result.index.column}`;

    // Long message
    const lines = markdown.split('\n');
    const underline = ((line) => {
        const maxLength = line.length - (start.column-1);
        const maxExpected = maxOfExpected(result.expected);
        return '^'.repeat(maxLength < maxExpected ? maxLength : maxExpected);
    });
    const line = lines[start.line - 1];
    const snippet = line + '\n' + ' '.repeat(start.column-1) + underline(line);
    const longMessage = shortMessage + '\n' + snippet;
    throw new ParseException(shortMessage, fileLocation, fileName, longMessage, 'markdown-template');
}

/**
 * Support for CiceroMark Templates
 */
class TemplateTransformer {
    /**
     * Construct the parser.
     */
    constructor() {
        // Setup for validation
        this.modelManager = new ModelManager();
        this.modelManager.addModelFile(CommonMarkModel, 'commonmark.cto');
        this.modelManager.addModelFile(CiceroMarkTemplateModel, 'ciceromarktemplate.cto');
        const factory = new Factory(this.modelManager);
        this.serializer = new Serializer(factory, this.modelManager);
    }

    /**
     * Converts a markdown string to a CiceroMark DOM
     * @param {string} markdown a markdown string
     * @param {object} template the template ast
     * @param {object} modelManager - the model manager (optional)
     * @param {string} [fileName] - the fileName for the markdown (optional)
     * @returns {object} the result of parsing
     */
    parse(markdown, template, modelManager, fileName) {
        const normalizedMarkdown = normalizeText(markdown);
        template = this.serializer.toJSON(this.serializer.fromJSON(template));
        const parser = parserOfTemplate(template,{contract:false});
        let result = parser.parse(normalizedMarkdown);
        if (result.status) {
            result = result.value;
            if (modelManager) {
                const factory = new Factory(modelManager);
                const serializer = new Serializer(factory, modelManager);
                result = serializer.toJSON(serializer.fromJSON(result));
            }
            return result;
        } else {
            _throwParseError(markdown,result,fileName);
        }
    }

}

module.exports.normalizeText = normalizeText;
module.exports.TemplateTransformer = TemplateTransformer;