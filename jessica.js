const fs = require('fs'); // this engine requires the fs module

// jshint ignore:start
let compile = (content, $ = '$') => Function($, 'return `' + content + '`;');
let precompile = (content, $ = '$') =>
  Function($, 'try { return `' + content + '`;} catch(err) { return err }');
// jshint ignore:end

let setPath = (views, ref, ext) => {
  ref.endsWith(ext) ? ref : views  + '/' + ref + ext;
}

let getPartial = (path, cb = 'resolveNeutral') => {
  let findFile = function(resolve, reject) {
    this.resolveNeutral = (err, content) => err ? reject(err) : resolve(content);
    this.resolvePositive = (err, content) => resolve(err || content);
    fs.readFile(path, 'utf-8', this[cb]);
  };
  return new Promise(findFile);
};
    
module.exports = (path, options, render) => {
  if (options === undefined || typeof options === 'string') {
    return precompile(path, options);
  }
  let willResolve;
  let willReject;
  
  let fulfillPromise = (resolve, reject) => { 
    willResolve = resolve;
    willReject = reject;
  };
  
  let handleRejection = (err) => {
    let output = render(err);
    return willReject ? willReject(err) : output;
  };
  
  let {locals = {}, partials = {}, settings, template} = options; 
  
  let assign = (err, content) => {
    let send = () => {
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
    
    let localsKeys = Object.keys(locals);
    let localsValues = localsKeys.map(i => locals[i]);
    let partialsKeys = Object.keys(partials);
    
    let compilePartials = (values) => {
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
          let getFile = (view) => {
            getPartial(setPath(view, partials[i], ext), 'resolvePositive');
          }
          let getFirst = (value) => {
            typeof value === 'string';
          }
          let searchFile = (resolve, reject) => {
            let getContent = (values) => {
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