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

var {
  Factory,
  Serializer,
  DateTimeUtil
} = require('@accordproject/concerto-core');
var ParsingTable = require('./parsingtable');
var draftVisitNodes = require('./ToCiceroMarkVisitor').visitNodes;
var ToParserVisitor = require('./ToParserVisitor');
var FormulaVisitor = require('./FormulaVisitor');
var {
  templateMarkManager,
  templateToTokens,
  tokensToUntypedTemplateMark,
  templateMarkTyping
} = require('./templatemarkutil');

/**
 * Hooks
 */

var defaultFormulaEval = name => {
  return (code, data, currentTime, utcOffset) => {
    var variables = Object.keys(data).filter(x => !(x === '$class' || x === 'clauseId' || x === 'contractId'));
    return " calculate(".concat(code, ")(").concat(variables, ") @ ").concat(currentTime.format(), " ");
  };
};

/**
 * Generates and manages a template parser/drafter
 * @class
 */
class ParserManager {
  /**
   * Create the ParserManager.
   * @param {object} modelManager - the model manager
   * @param {object} parsingTable - parsing table extension
   * @param {string} templateKind - either 'clause' or 'contract'
   * @param {*} formulaEval - function from formula code to JavaScript evaluation function
   */
  constructor(modelManager, parsingTable, templateKind, formulaEval) {
    this.modelManager = modelManager;
    this.factory = new Factory(this.modelManager);
    this.serializer = new Serializer(this.factory, this.modelManager);
    this.template = null;
    this.templateMark = null;
    this.parser = null;
    this.templateKind = templateKind ? templateKind : 'clause';
    // Default setting to now
    var {
      currentTime,
      utcOffset
    } = DateTimeUtil.setCurrentTime();
    this.currentTime = currentTime;
    this.utcOffset = utcOffset;
    this.userParsingTable = parsingTable;
    this.formulaEval = formulaEval ? formulaEval : defaultFormulaEval;

    // Initialize parsing table
    this.initParsingTable();
  }

  /**
   * Initialize parsing table
   */
  initParsingTable() {
    // Mapping from types to parsers/drafters
    this.parserVisitor = new ToParserVisitor();
    var parserHook = function parserHook(ast, parameters) {
      return ToParserVisitor.toParserWithParameters(new ToParserVisitor(), ast, parameters);
    };
    this.parsingTable = new ParsingTable(this.modelManager, parserHook, draftVisitNodes);
    if (this.userParsingTable) {
      this.parsingTable.addParsingTable(this.userParsingTable);
    }
  }

  /**
   * Gets the model manager for this parser
   * @return {object} the model manager
   */
  getModelManager() {
    return this.modelManager;
  }

  /**
   * Gets the factory for this parser
   * @return {object} the factory
   */
  getFactory() {
    return this.factory;
  }

  /**
   * Gets the serializer for this parser
   * @return {object} the serializer
   */
  getSerializer() {
    return this.serializer;
  }

  /**
   * Gets the template text
   * @return {string} the template
   */
  getTemplate() {
    return this.template;
  }

  /**
   * Sets the template
   * @param {string} template - the template text
   */
  setTemplate(template) {
    this.template = template;
  }

  /**
   * Gets the TemplateMark AST
   * @return {object} templateMark - the TemplateMark AST
   */
  getTemplateMark() {
    if (!this.templateMark) {
      throw new Error('Must call buildParser before calling getTemplateMark');
    }
    return this.templateMark;
  }

  /**
   * Sets the TemplateMark AST
   * @param {object} templateMark - the TemplateMark AST
   */
  setTemplateMark(templateMark) {
    this.templateMark = templateMark;
  }

  /**
   * Gets a parser object for this template
   * @return {object} the parser for this template
   */
  getParser() {
    if (!this.parser) {
      throw new Error('Must call buildParser before calling getParser');
    }
    return this.parser;
  }

  /**
   * Gets parsing table for variables
   * @return {object} the parsing table
   */
  getParsingTable() {
    return this.parsingTable;
  }

  /**
   * Sets parsing table extension
   * @param {object} table the parsing table
   */
  setParsingTable(table) {
    this.userParsingTable = table;
  }

  /**
   * Initialize the parser
   */
  initParser() {
    if (!this.templateMark) {
      var tokenStream = templateToTokens(this.template);
      var template = tokensToUntypedTemplateMark(tokenStream, this.templateKind);
      this.templateMark = templateMarkTyping(template, this.modelManager, this.templateKind);
    }
    this.parser = this.parserVisitor.toParser(this, this.templateMark, this.parsingTable);
  }

  /**
   * Build the parser
   */
  buildParser() {
    if (this.parser) {
      this.rebuildParser();
    } else {
      this.initParser();
    }
  }

  /**
   * Rebuild the parser
   */
  rebuildParser() {
    // Clear the parser
    this.parser = null;
    // Reinitialize the parsing table
    this.initParsingTable();
    // Clear templateMark if a template grammar exists
    if (this.template && this.templateMark) {
      this.templateMark = null;
    }
    this.initParser();
  }

  /**
   * Get the execute function for a given formula
   * @param {string} name - the name of that formula
   * @return {string} a function taking the contract data and returning the corresponding formula result
   */
  getFormulaEval(name) {
    return this.formulaEval(name);
  }

  /**
   * Set a new execute function for formulas
   * @param {*} evalFun - the eval function
   */
  setFormulaEval(evalFun) {
    this.formulaEval = evalFun;
  }

  /**
   * Get the formulas for this templatemark
   * @return {*} the formulas
   */
  getFormulas() {
    var visitor = new FormulaVisitor();
    return visitor.processFormulas(templateMarkManager.modelManager.serializer, this.getTemplateMark());
  }

  /**
   * Sets the template kind
   * @param {string} templateKind - either 'clause' or 'contract'
   */
  setTemplateKind(templateKind) {
    this.templateKind = templateKind;
  }

  /**
   * Sets the current time
   * @param {string} [currentTime] - the definition of 'now'
   * @param {number} [utcOffset] - UTC Offset for this execution
   */
  setCurrentTime(currentTime, utcOffset) {
    var {
      currentTime: setCurrentTime,
      utcOffset: setUtcOffset
    } = DateTimeUtil.setCurrentTime(currentTime, utcOffset);
    this.currentTime = setCurrentTime;
    this.utcOffset = setUtcOffset;
  }

  /**
   * Returns the current time
   * @return {string} the current time
   */
  getCurrentTime() {
    return this.currentTime;
  }

  /**
   * Returns the UTC offset
   * @return {number} the UTC offset
   */
  getUtcOffset() {
    return this.utcOffset;
  }
}
module.exports = ParserManager;