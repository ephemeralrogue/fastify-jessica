import fs from 'fs';

let compile = (content, $ = '$') => Function($, 'return `' + content + '`;');
let precompile = (content, $ = '$') =>
  Function($, 'try { return `' + content + '`;} catch(err) { return err }');

function setPath(views, ref, ext) {
  ref.endsWith(ext) ? ref : views  + '/' + ref + ext;
}

function getPartial(path, cb = 'resolveNeutral') {
  function findFile(resolve, reject) {
    this.resolveNeutral = (err, content) => err ? reject(err) : resolve(content);
    this.resolvePositive = (err, content) => resolve(err || content);
    fs.readFile(path, 'utf-8', this[cb]);
  }
  return new Promise(findFile);
}
    
export default function jessica(path, options, render) {
  if (options === undefined || typeof options === 'string') {
    return precompile(path, options);
  }
  
  let willResolve;
  let willReject;
  
  function fulfillPromise(resolve, reject) { 
    willResolve = resolve;
    willReject = reject;
  }
  
  function handleRejection(err) {
    let output = render(err);
    return willReject ? willReject(err) : output;
  }
  
  let {locals = {}, partials = {}, settings, template} = options;
  let localsKeys = Object.keys(locals);
  let localsValues = localsKeys.map(i => locals[i]);
  let partialsKeys = Object.keys(partials);
  
  function assign(err, content) {
    
    function send() {
      if (render) {
        try {
          let compiled = compile(content, localsKeys)(...localsValues);
          let output = render(null, compiled);
          return willResolve ? willResolve(compiled) : output;
        } catch(err) {
          return handleRejection(err);
        }
      }
      try {
        return willResolve(compile(content, localsKeys)(...localsValues));
      } catch (err) {
        return willReject(err);
      }
    }
    
    if (err) {
      return handleRejection(err);
    }
    
    function compilePartials(values) {
      let valTempList = localsValues.concat(values);
      try {
        localsValues.push(...values.map(i => compile(i, localsKeys)(...valTempList)));
      } catch (err) {
        return render(err);
      }
      send();
    }
  
    if (partialsKeys.length) {
      let applySettings = () => {
        let ext = `.${settings['view engine']}`;
        if (typeof settings.views === 'string') {
          return (i) => {
            getPartial(setPath(settings.views, partials[i], ext));
          }
        }
        return (i) => {
          function getFile(view) {
            getPartial(setPath(view, partials[i], ext), 'resolvePositive');
          }
          function getFirst(value) {
            typeof value === 'string';
          }
          function searchFile(resolve, reject) {
            function getContent(values) {
              resolve(values.find(getFirst));
            }
            Promise.all(settings.views.map(getFile)).then(getContent);
          };
          return new Promise(searchFile);
        }
      }
      
      let setPartial = settings ? applySettings() : i => getPartial(partials[i]);
      
      localsKeys.push(...partialsKeys);
      
      let willGetPartials = Promise.all(partialsKeys.map(setPartial))
        .then(compilePartials, handleRejection);
        
      return willResolve ? willGetPartials : new Promise(fulfillPromise);
    }
    return send();
  } // end of assign function
  
  if (template) {
    render = render || ((err, content) => err || content);
    return assign(null, path);
  }
  fs.readFile(path, 'utf-8', assign);
  return new Promise(fulfillPromise);
}

/*
Copyright (C) 2020 Joshua Alexander Castaneda

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/