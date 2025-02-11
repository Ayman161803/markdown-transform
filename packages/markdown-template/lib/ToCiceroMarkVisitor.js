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

var flatten = require('./util').flatten;
var generateJSON = require('./templatemarkutil').generateJSON;
var {
  NS_PREFIX_CommonMarkModel
} = require('@accordproject/markdown-common').CommonMarkModel;
var {
  NS_PREFIX_CiceroMarkModel
} = require('@accordproject/markdown-cicero').CiceroMarkModel;

/**
 * Drafts a CiceroMark DOM from a TemplateMark DOM
 */
class ToCiceroMarkVisitor {
  /**
   * Clone a CiceroMark node
   * @param {*} serializer the serializer
   * @param {*} node the node to visit
   * @param {*} [parameters] optional parameters
   * @return {*} the cloned node
   */
  static cloneNode(serializer, node) {
    return serializer.fromJSON(serializer.toJSON(node));
  }

  /**
   * Visits a sub-tree and return CiceroMark DOM
   * @param {*} visitor the visitor to use
   * @param {*} thing the node to visit
   * @param {*} [parameters] optional parameters
   */
  static visitChildren(visitor, thing, parameters) {
    if (thing.nodes) {
      thing.nodes = ToCiceroMarkVisitor.visitNodes(visitor, thing.nodes, parameters);
    }
  }

  /**
   * Visits a list of nodes and return the CiceroMark DOM
   * @param {*} visitor the visitor to use
   * @param {*} things the list node to visit
   * @param {*} [parameters] optional parameters
   * @return {*} the visited nodes
   */
  static visitNodes(visitor, things, parameters) {
    return flatten(things.map(node => {
      return node.accept(visitor, parameters);
    }));
  }

  /**
   * Match template tag to instance tag
   * @param {string} tag the template tag
   * @return {string} the corresponding instance tag
   */
  static matchTag(tag) {
    if (tag === 'VariableDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'Variable';
    } else if (tag === 'FormattedVariableDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'FormattedVariable';
    } else if (tag === 'EnumVariableDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'EnumVariable';
    } else if (tag === 'FormulaDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'Formula';
    } else if (tag === 'ClauseDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'Clause';
    } else if (tag === 'ConditionalDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'Conditional';
    } else if (tag === 'OptionalDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'Optional';
    } else if (tag === 'ListBlockDefinition') {
      return NS_PREFIX_CiceroMarkModel + 'ListBlock';
    } else {
      return tag;
    }
  }

  /**
   * Visit a node
   * @param {*} thing the object being visited
   * @param {*} parameters the parameters
   * @return {*} the visited nodes
   */
  visit(thing, parameters) {
    var that = this;
    switch (thing.getType()) {
      case 'EnumVariableDefinition':
        {
          var ciceroMarkTag = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(ciceroMarkTag);
          thing.value = '' + parameters.data[thing.name];
        }
        break;
      case 'VariableDefinition':
      case 'FormattedVariableDefinition':
        {
          var _ciceroMarkTag = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag);
          var data = thing.name === 'this' ? parameters.data : parameters.data[thing.name];
          var elementType = thing.identifiedBy ? 'Resource' : thing.elementType;
          parameters.visitor = that;
          var draftFun = parameters.parserManager.getParsingTable().getDrafter(thing.name, elementType, thing.format, parameters);
          var draftedTo = draftFun(data, thing.format);
          if (typeof draftedTo === 'string') {
            thing.value = '' + draftedTo;
          } else {
            return draftedTo;
          }
        }
        break;
      case 'ContractDefinition':
        {
          return ToCiceroMarkVisitor.visitNodes(this, thing.nodes, parameters);
        }
      case 'FormulaDefinition':
        {
          var _ciceroMarkTag2 = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag2);
          thing.value = parameters.parserManager.getFormulaEval(thing.name)(thing.code, parameters.fullData, parameters.currentTime);
        }
        break;
      case 'ClauseDefinition':
        {
          if (parameters.kind === 'contract') {
            var _ciceroMarkTag3 = ToCiceroMarkVisitor.matchTag(thing.getType());
            thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag3);
            var childrenParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: parameters.data[thing.name],
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            ToCiceroMarkVisitor.visitChildren(this, thing, childrenParameters);
          } else {
            ToCiceroMarkVisitor.visitChildren(this, thing, parameters);
          }
        }
        break;
      case 'WithDefinition':
        {
          var _childrenParameters = {
            parserManager: parameters.parserManager,
            templateMarkModelManager: parameters.templateMarkModelManager,
            templateMarkSerializer: parameters.templateMarkSerializer,
            fullData: parameters.fullData,
            data: parameters.data[thing.name],
            kind: parameters.kind,
            currentTime: parameters.currentTime
          };
          return ToCiceroMarkVisitor.visitNodes(this, thing.nodes, _childrenParameters);
        }
      case 'ConditionalDefinition':
        {
          var _ciceroMarkTag4 = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag4);
          ToCiceroMarkVisitor.visitNodes(this, thing.whenTrue, parameters);
          ToCiceroMarkVisitor.visitNodes(this, thing.whenFalse, parameters);
          if (parameters.data[thing.name]) {
            thing.isTrue = true;
            thing.nodes = thing.whenTrue;
          } else {
            thing.isTrue = false;
            thing.nodes = thing.whenFalse;
          }
        }
        break;
      case 'OptionalDefinition':
        {
          var _ciceroMarkTag5 = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag5);
          if (parameters.data[thing.name]) {
            thing.hasSome = true;
            thing.nodes = thing.whenSome;
            var someParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: parameters.data[thing.name],
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            ToCiceroMarkVisitor.visitNodes(this, thing.whenSome, someParameters);
            var noneParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: {},
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            ToCiceroMarkVisitor.visitNodes(this, thing.whenNone, noneParameters);
          } else {
            thing.hasSome = false;
            thing.nodes = thing.whenNone;
            var invented = generateJSON(parameters.parserManager.getModelManager(), thing.elementType);
            var _someParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: invented,
              // Need to invent some data here!
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            ToCiceroMarkVisitor.visitNodes(this, thing.whenSome, _someParameters);
            var _noneParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: {},
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            ToCiceroMarkVisitor.visitNodes(this, thing.whenNone, _noneParameters);
          }
        }
        break;
      case 'ListBlockDefinition':
        {
          // Clone the thing and create an item blueprint
          var itemNode = ToCiceroMarkVisitor.cloneNode(parameters.templateMarkSerializer, thing);
          itemNode.$classDeclaration = parameters.templateMarkModelManager.getType(NS_PREFIX_CommonMarkModel + 'Item');
          delete itemNode.elementType;
          delete itemNode.decorators;
          delete itemNode.name;
          delete itemNode.type;
          delete itemNode.start;
          delete itemNode.tight;
          delete itemNode.delimiter;
          var dataItems = parameters.data[thing.name];
          var mapItems = function mapItems(item) {
            var itemParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: item,
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            return ToCiceroMarkVisitor.cloneNode(parameters.templateMarkSerializer, itemNode).accept(that, itemParameters);
          };

          // Result List node
          var _ciceroMarkTag6 = ToCiceroMarkVisitor.matchTag(thing.getType());
          thing.$classDeclaration = parameters.templateMarkModelManager.getType(_ciceroMarkTag6);
          thing.nodes = flatten(dataItems.map(mapItems));
          delete thing.elementType;
        }
        break;
      case 'JoinDefinition':
        {
          // Clone the thing and create an item blueprint
          var _itemNode = ToCiceroMarkVisitor.cloneNode(parameters.templateMarkSerializer, thing);
          _itemNode.$classDeclaration = parameters.templateMarkModelManager.getType(NS_PREFIX_CommonMarkModel + 'Item');
          delete _itemNode.elementType;
          delete _itemNode.decorators;
          delete _itemNode.name;
          delete _itemNode.separator;
          var _dataItems = parameters.data[thing.name];
          var _mapItems = function _mapItems(item, index) {
            var itemParameters = {
              parserManager: parameters.parserManager,
              templateMarkModelManager: parameters.templateMarkModelManager,
              templateMarkSerializer: parameters.templateMarkSerializer,
              fullData: parameters.fullData,
              data: item,
              kind: parameters.kind,
              currentTime: parameters.currentTime
            };
            var resultNodes = ToCiceroMarkVisitor.cloneNode(parameters.templateMarkSerializer, _itemNode).accept(that, itemParameters)[0].nodes;
            if (index > 0) {
              resultNodes.unshift(parameters.templateMarkSerializer.fromJSON({
                '$class': 'org.accordproject.commonmark.Text',
                'text': thing.separator
              }));
            }
            return resultNodes;
          };

          // Result List node
          return flatten(_dataItems.map(_mapItems));
        }
      case 'Document':
        {
          ToCiceroMarkVisitor.visitChildren(this, thing.nodes[0], parameters);
          thing.nodes = thing.nodes[0].nodes;
        }
        break;
      default:
        ToCiceroMarkVisitor.visitChildren(this, thing, parameters);
    }
    return [thing];
  }
}
module.exports = ToCiceroMarkVisitor;