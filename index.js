(function(){
  'use strict';

  var acorn = require('acorn');
  var glob = require('glob-all');
  var fs = require('fs');
  var _ = require('lodash');

  var depth = 0;
  var requirements = [];

  const JS_ROOT="/Users/rharriso/Code/Ruby/builder/app/assets/javascripts";

  var files = glob.sync([
    `${JS_ROOT}/**/*_directive*.js`
  ]);

  for(var file of files){
    findDirectives(file); 
  }

  console.log(requirements);


  function findDirectives(file){
    console.log(file);
    var content = fs.readFileSync(file, "utf8");
    var ast = acorn.parse(content);
    depth = 0;
    walkNode(ast);    
  }

  function walkNode(node){
    depth++;
    switch(node.type){
      case 'FunctionExpression':
        walkNode(node.body);
        break;

      case 'CallExpression':
        walkNode(node.callee);
        if(isDirectiveMethod(node.callee)){
          requirements.push({
            name: node.arguments[0].value,
            requirements: findRequirements(node.arguments[1])
          });
        }
        break;
      
      case 'BlockStatement':
      case 'Program':
        for(var child of node.body){
          walkNode(child);
        }
        break;
      
      case 'ExpressionStatement':
        walkNode(node.expression);
        break;

      case 'MemberExpression':
        walkNode(node.object);
        walkNode(node.property);
        break;
    } 
    depth--;
  }

  function isDirectiveMethod(node){
    return node.type === "MemberExpression" && node.property.name === "directive";
  }

  function findRequirements(directiveArg){
    var dirFn = directiveArg;
    if(dirFn.type === 'ArrayExpression'){
      dirFn = _.last(dirFn.elements);
    }

    // assume directive is returned at the end of the function as an object 
    var returnStmt = _.last(dirFn.body.body);
    for(var p of returnStmt.argument.properties){
      if(p.key.name === 'requirements'){
        if(p.type === "ArrayExpression"){
          return _.pluck(p.value.elements, 'value');
        }
      }
    }
  }
})();
